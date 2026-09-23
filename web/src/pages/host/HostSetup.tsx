import { useState } from 'react';
import { api } from '../../api';
import { QuestionInput } from '../../types';

const PLACEHOLDER = `[
  {
    "type": "multiple_choice",
    "text": "Your question here?",
    "options": ["Option A", "Option B", "Option C", "Option D"],
    "correctIndex": 0,
    "timeLimitSec": 20,
    "points": 1000
  }
]`;

export function HostSetup({ onCreated }: { onCreated: (code: string, hostToken: string) => void }) {
  const [customizing, setCustomizing] = useState(false);
  const [json, setJson] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const create = async (questions?: QuestionInput[]) => {
    setLoading(true);
    setError(null);
    try {
      const { code, hostToken } = await api.createRoom(questions);
      onCreated(code, hostToken);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  };

  const createCustom = () => {
    try {
      const parsed = JSON.parse(json || PLACEHOLDER);
      if (!Array.isArray(parsed) || parsed.length === 0) throw new Error('Must be a non-empty array');
      create(parsed);
    } catch (err) {
      setError(`Invalid questions JSON: ${(err as Error).message}`);
    }
  };

  return (
    <div className="page">
      <h1 className="title">Host Setup</h1>
      <div className="card">
        {!customizing ? (
          <>
            <p>Use the default Perugia trivia questions, or write your own.</p>
            <div className="btn-row">
              <button className="btn btn-primary btn-lg" disabled={loading} onClick={() => create()}>
                🎉 Use Default Quiz
              </button>
              <button className="btn" disabled={loading} onClick={() => setCustomizing(true)}>
                ✏️ Customize Questions
              </button>
            </div>
          </>
        ) : (
          <>
            <p className="hint">Paste an array of multiple-choice questions as JSON:</p>
            <textarea
              className="json-editor"
              placeholder={PLACEHOLDER}
              value={json}
              onChange={(e) => setJson(e.target.value)}
            />
            <div className="btn-row" style={{ marginTop: 16 }}>
              <button className="btn btn-primary btn-lg" disabled={loading} onClick={createCustom}>
                🎉 Create Room
              </button>
              <button className="btn" onClick={() => setCustomizing(false)}>
                Back
              </button>
            </div>
          </>
        )}
        {error && <p className="error-text">{error}</p>}
      </div>
    </div>
  );
}
