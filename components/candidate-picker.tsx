"use client";
import SearchSelect from "./search-select";
import { useState } from "react";
import { Plus, Check } from "lucide-react";
import LocationPicker from "./location-picker";
import { db, getCrop, type Candidate } from "../lib/model";

export default function CandidatePicker({ initialSite, initialCrop, candidates, onAdd }: {
  initialSite: string; initialCrop: string; candidates: Candidate[];
  onAdd: (siteId: string, cropId: string) => void;
}) {
  const [siteId, setSiteId] = useState(initialSite), [cropId, setCropId] = useState(initialCrop);
  const exists = candidates.some((candidate) => candidate.siteId === siteId && candidate.cropId === cropId);
  const full = candidates.length >= 3;
  return <section className="comparison-picker" aria-label="Add comparison candidate">
    <div className="candidate-location"><span className="field-caption">Sample location</span><LocationPicker value={`site:${siteId}`} sampleOnly onLocate={() => {}} onChange={(value) => setSiteId(value.replace("site:", ""))} /></div>
    <label>Crop<SearchSelect aria-label="Comparison crop" value={cropId} onChange={(e) => setCropId(e.target.value)}>{db.crops.map((crop) => <option key={crop.id} value={crop.id}>{crop.name}{candidates.some((c) => c.siteId === siteId && c.cropId === crop.id) ? " · already added" : ""}</option>)}</SearchSelect></label>
    <button className="button primary" disabled={full || exists} onClick={() => onAdd(siteId, cropId)}>{exists ? <Check size={15} /> : <Plus size={15} />}{exists ? "Already added" : "Add candidate"}</button>
    <p className="candidate-picker-hint" role="status">{full ? "All 3 comparison slots are filled. Remove a candidate to add another." : exists ? `${getCrop(cropId).name} is already selected for this location. Choose another crop or location.` : `${candidates.length} of 3 selected. ${candidates.length < 2 ? "Add a second candidate to compare side by side." : "You can add one more candidate."}`}</p>
  </section>;
}
