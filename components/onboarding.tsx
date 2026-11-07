"use client";
import { useState, useEffect } from "react";
import {
  ArrowRight,
  ArrowLeft,
  Check,
  Globe2,
  Sprout,
  Landmark,
  Trees,
  FlaskConical,
  Package,
  MapPin,
  Leaf,
  Users,
} from "lucide-react";
import { Brand } from "./ui-kit";
import LocationPicker from "./location-picker";
import { Context, db, defaultContext } from "../lib/model";
const personas = [
  {
    name: "Commodity sourcing",
    description: "Build a resilient supply network",
    icon: Globe2,
  },
  {
    name: "Seed business",
    description: "Find trial sites & new markets",
    icon: Sprout,
  },
  {
    name: "Agricultural finance",
    description: "Understand portfolio exposure",
    icon: Landmark,
  },
  {
    name: "Land & estates",
    description: "Choose what to grow, and where",
    icon: Trees,
  },
  {
    name: "Ingredient buying",
    description: "Match origins to your needs",
    icon: Package,
  },
  {
    name: "Research",
    description: "Explore environments & evidence",
    icon: FlaskConical,
  },
];
export default function Onboarding({
  onComplete,
  onDemo,
  initialContext = defaultContext,
  onLocate,
  locating = false,
  geoMethod = "",
}: {
  initialContext?: Context;
  onLocate: () => void;
  locating?: boolean;
  geoMethod?: string;
  onComplete: (v: {
    workspace: string;
    project: string;
    persona: string;
    context: Context;
    invite: string;
    mode: string;
  }) => void;
  onDemo: () => void;
}) {
  const [step, setStep] = useState(0),
    [persona, setPersona] = useState("Commodity sourcing"),
    [workspace, setWorkspace] = useState("SBSF Agritech"),
    [project, setProject] = useState("Resilient cotton sourcing"),
    [mode, setMode] = useState("Find land for a crop"),
    [context, setContext] = useState(initialContext),
    [invite, setInvite] = useState("");
  useEffect(
    () => setContext((c) => ({ ...c, region: initialContext.region })),
    [initialContext.region],
  );
  return (
    <div className="onboarding">
      <section className="onboard-main">
        <Brand />
        <div className="onboard-content">
          <div className="step-label">
            YOUR WORKSPACE, YOUR WAY <span>0{step + 1} / 03</span>
          </div>
          <h1>
            {step === 0 ? (
              <>
                Good decisions
                <br />
                start with <em>good ground.</em>
              </>
            ) : step === 1 ? (
              <>
                A place for your
                <br />
                <em>next big decision.</em>
              </>
            ) : (
              <>
                Let’s find your
                <br />
                <em>starting point.</em>
              </>
            )}
          </h1>
          <p className="onboard-intro">
            {step === 0
              ? "Tell us what brings you here. We’ll shape your workspace around the decisions you make."
              : step === 1
                ? "Keep locations, evidence and your team’s thinking together in a project."
                : "Start with one crop and region. You can explore every crop, location and scenario later."}
          </p>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (step < 2) setStep(step + 1);
              else
                onComplete({
                  workspace,
                  project,
                  persona,
                  context,
                  invite,
                  mode,
                });
            }}
          >
            {step === 0 ? (
              <div className="persona-grid">
                {personas.map((p) => (
                  <button
                    type="button"
                    key={p.name}
                    className={
                      "persona " + (persona === p.name ? "selected" : "")
                    }
                    onClick={() => setPersona(p.name)}
                  >
                    <p.icon size={22} />
                    <strong>{p.name}</strong>
                    <small>{p.description}</small>
                    {persona === p.name && (
                      <Check className="persona-check" size={15} />
                    )}
                  </button>
                ))}
              </div>
            ) : step === 1 ? (
              <div className="onboard-fields">
                <label>
                  Workspace name
                  <input
                    required
                    maxLength={70}
                    value={workspace}
                    onChange={(e) => setWorkspace(e.target.value)}
                  />
                  <small>Your team’s shared home.</small>
                </label>
                <label>
                  First project
                  <input
                    required
                    maxLength={90}
                    value={project}
                    onChange={(e) => setProject(e.target.value)}
                  />
                </label>
                <label>What would you like to do first?</label>
                <div className="choice-row">
                  {["Find land for a crop", "Find crops for my land"].map(
                    (m) => (
                      <button
                        type="button"
                        key={m}
                        className={mode === m ? "selected" : ""}
                        onClick={() => setMode(m)}
                      >
                        <MapPin size={17} />
                        {m}
                        {mode === m && <Check size={16} />}
                      </button>
                    ),
                  )}
                </div>
              </div>
            ) : (
              <div className="onboard-fields">
                <div className="form-grid">
                  <label>
                    Priority crop
                    <select
                      value={context.crop}
                      onChange={(e) => {
                        setContext({
                          ...context,
                          crop: e.target.value,
                          season: db.crops.find((c) => c.id === e.target.value)!
                            .season,
                        });
                      }}
                    >
                      {db.crops.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.name}
                        </option>
                      ))}
                    </select>
                  </label>
                  <div className="onboard-location">
                    <label>Starting location</label>
                    <LocationPicker
                      compact
                      value={context.region}
                      onChange={(region) => setContext({ ...context, region })}
                      onLocate={onLocate}
                      locating={locating}
                      method={geoMethod}
                    />
                  </div>
                </div>
                <label>
                  Growing season
                  <select
                    value={context.season}
                    onChange={(e) =>
                      setContext({ ...context, season: e.target.value })
                    }
                  >
                    <option>Main season</option>
                    <option>Kharif</option>
                    <option>Rabi</option>
                  </select>
                </label>
                <label>
                  Bring a teammate <span className="muted">(optional)</span>
                  <input
                    type="email"
                    placeholder="colleague@company.com"
                    value={invite}
                    onChange={(e) => setInvite(e.target.value)}
                  />
                  <small>
                    Prototype invitation only. No email will be sent.
                  </small>
                </label>
                <div className="inline-note">
                  <Leaf size={17} />
                  <span>
                    Your workspace starts with clearly labelled, illustrative
                    data.
                  </span>
                </div>
              </div>
            )}
            <div className="onboard-actions">
              {step > 0 && (
                <button
                  type="button"
                  className="button ghost"
                  onClick={() => setStep(step - 1)}
                >
                  <ArrowLeft size={16} />
                  Back
                </button>
              )}
              <button
                className="button primary"
                type="submit"
                disabled={step === 2 && context.region === "Near me"}
              >
                {step === 2 ? "Open my workspace" : "Continue"}
                <ArrowRight size={17} />
              </button>
              {step === 0 && (
                <button type="button" className="text-button" onClick={onDemo}>
                  Explore the demo first <ArrowUpRightIcon />
                </button>
              )}
            </div>
          </form>
        </div>
        <footer>
          Environmental intelligence. Human decisions.
          <span>© 2026 SBSF Agritech</span>
        </footer>
      </section>
      <aside className="onboard-story">
        <span className="story-kicker">
          <span className="live-dot" />
          LAND INTELLIGENCE, CONNECTED.
        </span>
        <div className="story-map">
          <svg viewBox="0 0 600 550" aria-hidden="true">
            <defs>
              <pattern
                id="onboardgrid"
                width="24"
                height="24"
                patternUnits="userSpaceOnUse"
              >
                <path
                  d="M24 0H0V24"
                  fill="none"
                  stroke="#7b9d7a"
                  strokeWidth=".5"
                  opacity=".28"
                />
              </pattern>
              <radialGradient id="mapglow">
                <stop stopColor="#a8bc7e" stopOpacity=".2" />
                <stop offset="1" stopColor="#193e32" stopOpacity="0" />
              </radialGradient>
            </defs>
            <rect width="600" height="550" fill="url(#mapglow)" />
            <path
              d="M98 88L213 52 293 102 342 90 406 142 465 157 443 243 472 307 409 324 383 399 298 471 278 423 220 386 186 312 125 285 157 214 112 179Z"
              fill="url(#onboardgrid)"
              stroke="#90aa80"
              strokeWidth="1.5"
              opacity=".6"
            />
            {[0, 1, 2, 3, 4, 5, 6].map((i) => (
              <path
                key={i}
                d={`M${30 + i * 18} ${150 + i * 38} Q220 ${40 + i * 55} 350 ${180 + i * 32} T610 ${210 + i * 40}`}
                fill="none"
                stroke="#aec59a"
                strokeWidth=".7"
                opacity=".15"
              />
            ))}
            <path
              d="M200 220Q270 145 367 221T320 355"
              stroke="#b4d696"
              strokeDasharray="4 6"
              fill="none"
              opacity=".6"
            />
            {[
              [200, 220],
              [367, 221],
              [320, 355],
            ].map(([x, y], i) => (
              <g key={i}>
                <circle cx={x} cy={y} r="26" fill="#c9dfae" opacity=".08" />
                <circle cx={x} cy={y} r="15" fill="#bed89b" />
                <circle cx={x} cy={y} r="5" fill="#214d3b" />
              </g>
            ))}
          </svg>
          <div className="story-fit">
            <span>
              <Leaf size={16} /> An environment that fits.
            </span>
            <strong>
              92<span>/100</span>
            </strong>
            <small>Illustrative environmental suitability</small>
            <div className="tiny-progress">
              <i />
            </div>
          </div>
          <div className="story-coordinate">21.0077° N · 75.5626° E</div>
        </div>
        <div className="story-copy">
          <span className="eyebrow">FROM POSSIBILITY TO A PLAN</span>
          <h2>
            Right crop.
            <br />
            Right place.
            <br />
            <em>Shared confidence.</em>
          </h2>
          <p>
            Discover, compare and decide — with the land at the centre and your
            team in the loop.
          </p>
          <div className="story-steps">
            {["Discover", "Compare", "Decide"].map((s, i) => (
              <span key={s}>
                <b>0{i + 1}</b>
                {s}
              </span>
            ))}
          </div>
        </div>
        <div className="story-bottom">
          <Users size={15} /> Built for the people behind every growing
          decision.
        </div>
      </aside>
    </div>
  );
}
function ArrowUpRightIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 20 20" fill="none">
      <path d="M5 15L15 5M5 5H15V15" stroke="currentColor" strokeWidth="1.5" />
    </svg>
  );
}
