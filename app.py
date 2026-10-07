"""Streamlit UI. Run: streamlit run app.py"""
import os
import tempfile

import streamlit as st

from orchestrator import run_pipeline
from utils import diff_turns_html, export_json, export_markdown, fmt_time

st.set_page_config(page_title="Meeting Intelligence Assistant", layout="wide")
st.title("Meeting Intelligence Assistant")

audio = st.file_uploader("Meeting audio", type=["wav", "mp3", "m4a", "flac", "ogg"])
gloss = st.file_uploader("Domain glossary (optional .txt, one term per line)", type=["txt"])

if audio and st.button("Process", type="primary"):
    tmp = tempfile.mkdtemp()
    apath = os.path.join(tmp, audio.name)
    open(apath, "wb").write(audio.getbuffer())
    gpath = None
    if gloss:
        gpath = os.path.join(tmp, "glossary.txt")
        open(gpath, "wb").write(gloss.getbuffer())
    with st.status("Running pipeline...", expanded=True) as status:
        res = run_pipeline(apath, gpath, progress=lambda m: status.write(m))
        status.update(label="Finished" if not res.errors else "Finished with issues", state="complete")
    st.session_state["res"] = res

res = st.session_state.get("res")
if res:
    for e in res.errors:
        st.error(e)
    if res.raw:
        tabs = st.tabs(["Raw", "Refined (diff)", "Minutes", "Decisions", "Actions", "Flags"])
        with tabs[0]:
            for t in res.raw.turns:
                st.markdown(f"**[{fmt_time(t.start)}] {t.speaker}:** {t.text}")
        with tabs[1]:
            st.caption("Red = removed, green = added")
            st.markdown(diff_turns_html(res.raw.turns, res.refined.turns), unsafe_allow_html=True)
        if res.docs:
            with tabs[2]:
                st.subheader("Executive Summary"); st.write(res.docs.summary)
                st.subheader("Minutes")
                for m in res.docs.minutes:
                    st.markdown(f"- {m}")
            with tabs[3]:
                for d in res.docs.key_decisions or []:
                    st.markdown(f"- **{d.decision}**  \n  _\"{d.evidence.quote}\"_ ({d.evidence.speaker} @ {d.evidence.timestamp})")
                if not res.docs.key_decisions:
                    st.info("No explicit decisions identified.")
            with tabs[4]:
                st.table([{"Task": a.task, "Owner": a.owner or "unspecified",
                           "Deadline": a.deadline or "unspecified"} for a in res.docs.action_items])
        with tabs[5]:
            st.write(res.models); st.write(res.timings)
            for f in res.flags:
                st.warning(f)
        c1, c2 = st.columns(2)
        c1.download_button("Download JSON", export_json(res), "meeting_record.json", "application/json")
        c2.download_button("Download Markdown", export_markdown(res), "meeting_record.md", "text/markdown")
