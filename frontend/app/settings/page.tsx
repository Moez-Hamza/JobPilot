"use client";

import { useEffect, useState } from "react";
import { api, type UserPreferences } from "@/lib/api";
import { Save, Loader2, Plus, X, CheckCircle2 } from "lucide-react";
import { clsx } from "clsx";

type ArrayField = "target_titles" | "target_locations" | "keywords_include" | "keywords_exclude";

const EXPERIENCE_LEVELS = ["Junior", "Mid", "Senior", "Lead"];

interface TagInputProps {
  field: ArrayField;
  label: string;
  placeholder: string;
  tags: string[];
  inputValue: string;
  onInputChange: (val: string) => void;
  onAdd: () => void;
  onRemove: (tag: string) => void;
}

function TagInput({ label, placeholder, tags, inputValue, onInputChange, onAdd, onRemove }: Omit<TagInputProps, "field">) {
  return (
    <div>
      <label className={clsx('block', 'text-sm', 'font-medium', 'text-gray-300', 'mb-2')}>{label}</label>
      <div className={clsx('flex', 'flex-wrap', 'gap-2', 'mb-2')}>
        {tags.map((tag) => (
          <span key={tag} className={clsx('inline-flex', 'items-center', 'gap-1', 'bg-indigo-900/40', 'border', 'border-indigo-700/40', 'text-indigo-300', 'text-xs', 'px-2.5', 'py-1', 'rounded-full')}>
            {tag}
            <button type="button" onClick={() => onRemove(tag)} className={clsx('text-indigo-400', 'hover:text-white', 'transition-colors')}>
              <X className={clsx('w-3', 'h-3')} />
            </button>
          </span>
        ))}
      </div>
      <div className={clsx('flex', 'gap-2')}>
        <input
          type="text"
          placeholder={placeholder}
          value={inputValue}
          onChange={(e) => onInputChange(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); onAdd(); } }}
          className={clsx('flex-1', 'bg-gray-950', 'border', 'border-gray-700', 'rounded-lg', 'px-3', 'py-2', 'text-sm', 'text-gray-100', 'placeholder-gray-600', 'focus:outline-none', 'focus:border-indigo-500')}
        />
        <button type="button" onClick={onAdd}
          className={clsx('bg-gray-800', 'hover:bg-gray-700', 'text-gray-300', 'px-3', 'py-2', 'rounded-lg', 'transition-colors')}>
          <Plus className={clsx('w-4', 'h-4')} />
        </button>
      </div>
    </div>
  );
}

export default function SettingsPage() {
  const [prefs, setPrefs] = useState<Omit<UserPreferences, "id">>({
    target_titles: ["Full Stack Developer", "Backend Engineer"],
    target_locations: ["Tunis", "Paris"],
    experience_level: "Mid",
    keywords_include: ["Python", "React", "TypeScript", "Node.js", "FastAPI", "Next.js"],
    keywords_exclude: ["Crypto", "Web3", "Blockchain", "NFT"],
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");
  const [inputs, setInputs] = useState<Record<ArrayField, string>>({
    target_titles: "",
    target_locations: "",
    keywords_include: "",
    keywords_exclude: "",
  });

  useEffect(() => {
    void (async () => {
      try {
        const data = await api.getPreferences();
        setPrefs({
          target_titles: data.target_titles,
          target_locations: data.target_locations,
          experience_level: data.experience_level,
          keywords_include: data.keywords_include,
          keywords_exclude: data.keywords_exclude,
        });
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  function addTag(field: ArrayField) {
    const val = inputs[field].trim();
    if (!val || prefs[field].includes(val)) return;
    setPrefs((p) => ({ ...p, [field]: [...p[field], val] }));
    setInputs((i) => ({ ...i, [field]: "" }));
  }

  function removeTag(field: ArrayField, tag: string) {
    setPrefs((p) => ({ ...p, [field]: p[field].filter((t) => t !== tag) }));
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError("");
    try {
      await api.savePreferences(prefs);
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to save");
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className={clsx('flex', 'items-center', 'justify-center', 'h-64', 'text-gray-600')}>
        <Loader2 className={clsx('w-6', 'h-6', 'animate-spin', 'mr-2')} />
        Loading preferences...
      </div>
    );
  }

  return (
    <div className={clsx('p-6', 'max-w-2xl', 'mx-auto')}>
      <div className="mb-8">
        <h1 className={clsx('text-2xl', 'font-bold', 'text-white')}>Job Preferences</h1>
        <p className={clsx('text-gray-400', 'text-sm', 'mt-1')}>
          Configure your search criteria. These are used to filter scraper results.
        </p>
      </div>

      <form onSubmit={handleSave} className="space-y-6">
        <div className={clsx('bg-gray-900', 'border', 'border-gray-800', 'rounded-xl', 'p-5', 'space-y-5')}>
          <TagInput
            label="Target Job Titles"
            placeholder="e.g. Full Stack Developer"
            tags={prefs.target_titles}
            inputValue={inputs.target_titles}
            onInputChange={(v) => setInputs((i) => ({ ...i, target_titles: v }))}
            onAdd={() => addTag("target_titles")}
            onRemove={(t) => removeTag("target_titles", t)}
          />
          <TagInput
            label="Target Locations"
            placeholder="e.g. Tunis, Paris, Remote"
            tags={prefs.target_locations}
            inputValue={inputs.target_locations}
            onInputChange={(v) => setInputs((i) => ({ ...i, target_locations: v }))}
            onAdd={() => addTag("target_locations")}
            onRemove={(t) => removeTag("target_locations", t)}
          />

          <div>
            <label className={clsx('block', 'text-sm', 'font-medium', 'text-gray-300', 'mb-2')}>
              Experience Level
            </label>
            <div className={clsx('flex', 'gap-2')}>
              {EXPERIENCE_LEVELS.map((level) => (
                <button
                  key={level}
                  type="button"
                  onClick={() => setPrefs((p) => ({ ...p, experience_level: level }))}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                    prefs.experience_level === level
                      ? "bg-indigo-600 text-white"
                      : "bg-gray-800 text-gray-400 hover:text-white"
                  }`}
                >
                  {level}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className={clsx('bg-gray-900', 'border', 'border-gray-800', 'rounded-xl', 'p-5', 'space-y-5')}>
          <TagInput
            label="Keywords to Include"
            placeholder="e.g. React, Python, TypeScript"
            tags={prefs.keywords_include}
            inputValue={inputs.keywords_include}
            onInputChange={(v) => setInputs((i) => ({ ...i, keywords_include: v }))}
            onAdd={() => addTag("keywords_include")}
            onRemove={(t) => removeTag("keywords_include", t)}
          />
          <TagInput
            label="Keywords to Exclude"
            placeholder="e.g. Crypto, Web3, Blockchain"
            tags={prefs.keywords_exclude}
            inputValue={inputs.keywords_exclude}
            onInputChange={(v) => setInputs((i) => ({ ...i, keywords_exclude: v }))}
            onAdd={() => addTag("keywords_exclude")}
            onRemove={(t) => removeTag("keywords_exclude", t)}
          />
        </div>

        {error && (
          <p className={clsx('text-sm', 'text-red-400')}>{error}</p>
        )}

        {saved && (
          <div className={clsx('flex', 'items-center', 'gap-2', 'text-green-400', 'text-sm')}>
            <CheckCircle2 className={clsx('w-4', 'h-4')} />
            Preferences saved successfully
          </div>
        )}

        <button
          type="submit"
          disabled={saving}
          className={clsx('flex', 'items-center', 'gap-2', 'bg-indigo-600', 'hover:bg-indigo-500', 'disabled:opacity-60', 'text-white', 'font-medium', 'px-5', 'py-2.5', 'rounded-lg', 'transition-colors')}
        >
          {saving ? <Loader2 className={clsx('w-4', 'h-4', 'animate-spin')} /> : <Save className={clsx('w-4', 'h-4')} />}
          Save Preferences
        </button>
      </form>
    </div>
  );
}
