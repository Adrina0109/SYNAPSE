import { useRef, useState } from 'react';
import api from '../../lib/api.js';

const MAX_FILE_SIZE = 2 * 1024 * 1024;
const ACCEPTED_TYPES = {
    '.pdf': 'application/pdf',
    '.txt': 'text/plain',
};

const getFileError = (file) => {
    if (!file) return '';
    if (file.size > MAX_FILE_SIZE) return 'Resume file must be 2 MB or smaller.';
    const extension = file.name.slice(file.name.lastIndexOf('.')).toLowerCase();
    if (ACCEPTED_TYPES[extension] !== file.type) return 'Choose a PDF or TXT file.';
    return '';
};

export default function ResumeGap({ onRoadmapPreview }) {
    const fileInputRef = useRef(null);
    const [file, setFile] = useState(null);
    const [resumeText, setResumeText] = useState('');
    const [jobDescription, setJobDescription] = useState('');
    const [isAnalyzing, setIsAnalyzing] = useState(false);
    const [analysisError, setAnalysisError] = useState('');
    const [result, setResult] = useState(null);
    const [isBuildingRoadmap, setIsBuildingRoadmap] = useState(false);
    const [roadmapError, setRoadmapError] = useState('');

    const chooseFile = (event) => {
        const chosen = event.target.files?.[0] || null;
        const error = getFileError(chosen);
        if (error) {
            setFile(null);
            event.target.value = '';
            setAnalysisError(error);
            return;
        }
        setAnalysisError('');
        setResult(null);
        setFile(chosen);
    };

    const analyze = async (event) => {
        event.preventDefault();
        setAnalysisError('');
        setResult(null);
        if (jobDescription.trim().length < 80 || jobDescription.trim().length > 8000) {
            setAnalysisError('Job description must be between 80 and 8000 characters.');
            return;
        }
        if (!file && resumeText.trim().length < 80) {
            setAnalysisError('Upload a PDF or TXT, or paste your resume text (at least 80 characters).');
            return;
        }

        setIsAnalyzing(true);
        try {
            let response;
            if (file) {
                const formData = new FormData();
                formData.append('resume', file);
                formData.append('jobDescription', jobDescription.trim());
                                response = await api.post('/placement/resume-gap', formData, {
                    headers: { 'Content-Type': 'multipart/form-data' },
                });
            } else {
                response = await api.post('/placement/resume-gap', {
                    jobDescription: jobDescription.trim(),
                    resumeText: resumeText.trim(),
                });
            }
            setResult(response.data);
        } catch (error) {
            setAnalysisError(error.response?.data?.message || 'Could not analyze this resume. Please try again.');
        } finally {
            setIsAnalyzing(false);
        }
    };

    const buildRoadmap = async () => {
        if (!result?.missingSkills?.length || isBuildingRoadmap) return;
        setIsBuildingRoadmap(true);
        setRoadmapError('');
        try {
            await onRoadmapPreview(result.missingSkills);
        } catch (error) {
            setRoadmapError(error.response?.data?.message || 'Could not create a roadmap preview. Please try again.');
        } finally {
            setIsBuildingRoadmap(false);
        }
    };

    return (
        <section className="card-hard min-w-0 space-y-5 p-4 sm:p-6" aria-labelledby="resume-gap-heading">
            <div>
                <p className="section-label mb-2">Resume review</p>
                <h2 id="resume-gap-heading" className="font-display text-2xl font-semibold text-ink">Resume gap analyzer</h2>
                <p className="mt-2 font-body text-sm leading-relaxed text-ink-muted">
                    Compare your resume with a role description and identify skills to strengthen.
                </p>
            </div>

            <form className="space-y-4" onSubmit={analyze}>
                <div className="space-y-2">
                    <label htmlFor="resume-file" className="block font-body text-sm font-medium text-ink">Resume file (PDF or TXT)</label>
                    <input
                        ref={fileInputRef}
                        id="resume-file"
                        type="file"
                        accept=".pdf,.txt,application/pdf,text/plain"
                        onChange={chooseFile}
                        className="block w-full min-w-0 font-body text-xs text-ink-muted file:mr-3 file:border file:border-ink/20 file:bg-paper file:px-3 file:py-2 file:font-body file:text-xs file:text-ink"
                    />
                    {file && (
                        <div className="flex flex-wrap items-center gap-3">
                            <p className="break-all font-mono text-xs text-ink-faint">{file.name}</p>
                            <button
                                type="button"
                                className="btn-ghost px-2 py-1 text-xs"
                                onClick={() => {
                                    setFile(null);
                                    setResult(null);
                                    if (fileInputRef.current) fileInputRef.current.value = '';
                                }}
                            >
                                Remove file
                            </button>
                        </div>
                    )}
                    <p className="font-mono text-[10px] text-ink-faint">Maximum size: 2 MB.</p>
                </div>

                {!file && (
                    <div className="space-y-2">
                        <label htmlFor="resume-text" className="block font-body text-sm font-medium text-ink">Or paste resume text</label>
                        <textarea
                            id="resume-text"
                            className="input-base min-h-36 resize-y"
                            maxLength={20000}
                            value={resumeText}
                            onChange={(event) => setResumeText(event.target.value)}
                            placeholder="Paste at least 80 characters of resume text"
                        />
                    </div>
                )}

                <div className="space-y-2">
                    <div className="flex flex-wrap items-baseline justify-between gap-2">
                        <label htmlFor="job-description" className="font-body text-sm font-medium text-ink">Job description</label>
                        <span className="font-mono text-[10px] text-ink-faint">{jobDescription.length} / 8000</span>
                    </div>
                    <textarea
                        id="job-description"
                        className="input-base min-h-36 resize-y"
                        minLength={80}
                        maxLength={8000}
                        required
                        value={jobDescription}
                        onChange={(event) => setJobDescription(event.target.value)}
                        placeholder="Paste the role description (80 to 8000 characters)"
                    />
                </div>

                {analysisError && <p className="font-body text-sm text-signal" role="alert">{analysisError}</p>}
                <button type="submit" className="btn-primary w-full sm:w-auto" disabled={isAnalyzing}>
                    {isAnalyzing ? 'Analyzing resume…' : 'Analyze resume'}
                </button>
            </form>

            {result && (
                <div className="space-y-5 border-t border-ink/10 pt-5">
                    <div className="flex flex-wrap items-baseline justify-between gap-2">
                        <h3 className="font-display text-xl font-semibold text-ink">Resume results</h3>
                        <p className="font-mono text-sm text-ink">
                            Resume quality (AI estimate): {result.resumeScore} / 100
                        </p>
                    </div>
                    <p className="font-body text-xs leading-relaxed text-ink-faint">{result.note}</p>
                    <div>
                        <p className="section-label mb-2">Matched skills</p>
                        {result.matchedSkills.length > 0 ? (
                            <div className="flex flex-wrap gap-2">
                                {result.matchedSkills.map((skill) => <span className="tag-pill" key={skill}>{skill}</span>)}
                            </div>
                        ) : <p className="font-body text-sm text-ink-faint">No matching skills found.</p>}
                    </div>
                    <div>
                        <p className="section-label mb-2">Skills to build</p>
                        {result.missingSkills.length > 0 ? (
                            <div className="flex flex-wrap gap-2">
                                {result.missingSkills.map((skill) => <span className="tag-pill-outline" key={skill}>{skill}</span>)}
                            </div>
                        ) : <p className="font-body text-sm text-ink-faint">No skill gaps found for this role.</p>}
                    </div>
                    <div>
                        <p className="section-label mb-2">Resume improvements</p>
                        <ol className="list-decimal space-y-2 pl-5 font-body text-sm leading-relaxed text-ink">
                            {result.suggestions.map((suggestion, index) => <li key={`${index}-${suggestion}`}>{suggestion}</li>)}
                        </ol>
                    </div>
                    {result.missingSkills.length > 0 && (
                        <div className="space-y-2">
                            <button
                                type="button"
                                className="btn-secondary w-full sm:w-auto"
                                onClick={buildRoadmap}
                                disabled={isBuildingRoadmap}
                            >
                                {isBuildingRoadmap ? 'Building preview…' : 'Create roadmap from gaps'}
                            </button>
                            {roadmapError && <p className="font-body text-sm text-signal" role="alert">{roadmapError}</p>}
                        </div>
                    )}
                </div>
            )}
        </section>
    );
}
