"use client"

import { motion, AnimatePresence } from "framer-motion"
import { X, Monitor, Volume2, MousePointer2, Globe, type LucideIcon } from "lucide-react"
import { useState } from "react"
import { useStore } from "@/lib/store"
import { cn } from "@/lib/utils"

type TabId = "display" | "audio" | "controls" | "region"

const TABS: { id: TabId; label: string; icon: LucideIcon }[] = [
  { id: "display", label: "Display", icon: Monitor },
  { id: "audio", label: "Audio", icon: Volume2 },
  { id: "controls", label: "Controls", icon: MousePointer2 },
  { id: "region", label: "Region", icon: Globe },
]

function Slider({
  id,
  label,
  value,
  onChange,
  suffix = "%",
  min = 0,
  max = 100,
}: {
  id: string
  label: string
  value: number
  onChange: (v: number) => void
  suffix?: string
  min?: number
  max?: number
}) {
  const pct = ((value - min) / (max - min)) * 100
  return (
    <div>
      <label htmlFor={id} className="mb-2 flex items-center justify-between text-sm text-text-high">
        <span>{label}</span>
        <span className="rounded-md bg-white/5 px-2 py-0.5 font-display text-xs font-bold tabular-nums text-primary">
          {value}
          {suffix}
        </span>
      </label>
      <input
        id={id}
        type="range"
        min={min}
        max={max}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="h-2 w-full cursor-pointer appearance-none rounded-full outline-none [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:border-2 [&::-webkit-slider-thumb]:border-background [&::-webkit-slider-thumb]:bg-primary [&::-webkit-slider-thumb]:shadow-[0_0_8px_rgba(229,53,43,0.6)] [&::-webkit-slider-thumb]:transition-transform hover:[&::-webkit-slider-thumb]:scale-110 [&::-moz-range-thumb]:h-4 [&::-moz-range-thumb]:w-4 [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:border-2 [&::-moz-range-thumb]:border-background [&::-moz-range-thumb]:bg-primary"
        style={{
          background: `linear-gradient(to right, var(--primary) ${pct}%, rgba(255,255,255,0.12) ${pct}%)`,
        }}
      />
    </div>
  )
}

function Toggle({
  checked,
  onChange,
  label,
}: {
  checked: boolean
  onChange: () => void
  label: string
}) {
  return (
    <div className="flex items-center justify-between gap-4 rounded-lg border border-border bg-surface px-3.5 py-3">
      <span className="text-sm text-text-high">{label}</span>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        aria-label={label}
        onClick={onChange}
        className={cn(
          "relative h-6 w-11 shrink-0 rounded-full transition-colors",
          checked ? "bg-primary" : "bg-white/15",
        )}
      >
        <span
          className={cn(
            "absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform",
            checked ? "translate-x-[22px]" : "translate-x-0.5",
          )}
        />
      </button>
    </div>
  )
}

function Select({
  label,
  value,
  onChange,
  children,
}: {
  label: string
  value: string
  onChange: (v: string) => void
  children: React.ReactNode
}) {
  return (
    <div className="flex items-center justify-between gap-4 rounded-lg border border-border bg-surface px-3.5 py-2.5">
      <span className="text-sm text-text-high">{label}</span>
      <select
        aria-label={label}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="rounded-md border border-border bg-surface-2 px-2.5 py-1.5 text-sm text-text-high outline-none transition-colors focus:border-primary"
      >
        {children}
      </select>
    </div>
  )
}

function Segmented({
  options,
  value,
  onChange,
}: {
  options: { label: string; value: string }[]
  value: string
  onChange: (v: string) => void
}) {
  return (
    <div className="flex gap-1 rounded-lg border border-border bg-surface p-1">
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          onClick={() => onChange(o.value)}
          className={cn(
            "flex-1 rounded-md px-3 py-1.5 text-sm font-semibold transition-colors",
            value === o.value
              ? "bg-primary text-primary-foreground"
              : "text-text-medium hover:text-text-high",
          )}
        >
          {o.label}
        </button>
      ))}
    </div>
  )
}

export function SettingsModal() {
  const settingsOpen = useStore((s) => s.settingsOpen)
  const setSettingsOpen = useStore((s) => s.setSettingsOpen)
  const settings = useStore((s) => s.settings)
  const updateSettings = useStore((s) => s.updateSettings)
  const [tab, setTab] = useState<TabId>("display")

  return (
    <AnimatePresence>
      {settingsOpen && (
        <motion.div
          className="fixed inset-0 z-[60] flex items-center justify-center p-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          <div
            className="absolute inset-0 bg-black/70 backdrop-blur-sm"
            onClick={() => setSettingsOpen(false)}
            aria-hidden
          />
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-label="Settings"
            className="tick-corners relative z-10 flex max-h-[86vh] w-full max-w-2xl flex-col overflow-hidden rounded-xl border border-border-strong bg-surface-2 shadow-2xl"
            initial={{ scale: 0.95, y: 12 }}
            animate={{ scale: 1, y: 0 }}
            exit={{ scale: 0.95, y: 12 }}
          >
            {/* Header */}
            <div className="relative flex items-center justify-between border-b border-border px-5 py-4">
              <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_left,rgba(229,53,43,0.12),transparent_60%)]" />
              <div className="relative flex items-center gap-3">
                <span className="label-mono text-[10px] text-primary">SYS</span>
                <span className="h-3 w-px bg-border-strong" />
                <h2 className="font-display text-lg font-bold uppercase tracking-tight text-text-high">
                  Settings
                </h2>
              </div>
              <button
                type="button"
                onClick={() => setSettingsOpen(false)}
                aria-label="Close settings"
                className="relative rounded-md p-1.5 text-text-medium transition-colors hover:bg-white/10 hover:text-text-high"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="flex min-h-0 flex-1 flex-col sm:flex-row">
              {/* Sidebar tabs */}
              <nav className="flex shrink-0 gap-1 overflow-x-auto border-b border-border p-2 sm:w-44 sm:flex-col sm:overflow-visible sm:border-b-0 sm:border-r sm:p-3">
                {TABS.map((t) => {
                  const Icon = t.icon
                  const active = tab === t.id
                  return (
                    <button
                      key={t.id}
                      type="button"
                      onClick={() => setTab(t.id)}
                      className={cn(
                        "relative flex shrink-0 items-center gap-2.5 rounded-lg px-3 py-2.5 text-sm font-semibold transition-colors",
                        active ? "text-text-high" : "text-text-low hover:text-text-medium",
                      )}
                    >
                      {active && (
                        <motion.span
                          layoutId="settings-tab"
                          className="absolute inset-0 rounded-lg border border-primary/40 bg-primary/10"
                        />
                      )}
                      <Icon className="relative h-4 w-4" />
                      <span className="relative">{t.label}</span>
                    </button>
                  )
                })}
              </nav>

              {/* Panel */}
              <div className="min-h-0 flex-1 overflow-y-auto p-5">
                <AnimatePresence mode="wait">
                  <motion.div
                    key={tab}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -8 }}
                    transition={{ duration: 0.18 }}
                    className="flex flex-col gap-4"
                  >
                    {tab === "display" && (
                      <>
                        <div>
                          <p className="mb-2 text-sm text-text-high">Resolution</p>
                          <Segmented
                            value={settings.resolution}
                            onChange={(v) => updateSettings({ resolution: v as typeof settings.resolution })}
                            options={[
                              { label: "1920 x 1080", value: "1920x1080" },
                              { label: "1366 x 768", value: "1366x768" },
                            ]}
                          />
                        </div>
                        <Slider
                          id="brightness"
                          label="Brightness"
                          value={settings.brightness}
                          onChange={(v) => updateSettings({ brightness: v })}
                        />
                        <Toggle
                          label="Reduce animations"
                          checked={settings.reduceAnimations}
                          onChange={() => updateSettings({ reduceAnimations: !settings.reduceAnimations })}
                        />
                      </>
                    )}

                    {tab === "audio" && (
                      <>
                        <Slider
                          id="master"
                          label="Master volume"
                          value={settings.masterVolume}
                          onChange={(v) => updateSettings({ masterVolume: v })}
                        />
                        <Slider
                          id="game"
                          label="Game volume"
                          value={settings.gameVolume}
                          onChange={(v) => updateSettings({ gameVolume: v })}
                        />
                        <Slider
                          id="chat"
                          label="Chat volume"
                          value={settings.chatVolume}
                          onChange={(v) => updateSettings({ chatVolume: v })}
                        />
                        <Select
                          label="Output device"
                          value={settings.outputDevice}
                          onChange={(v) => updateSettings({ outputDevice: v })}
                        >
                          <option>Speakers (Realtek)</option>
                          <option>Headset (HyperX)</option>
                          <option>Monitor (HDMI)</option>
                        </Select>
                      </>
                    )}

                    {tab === "controls" && (
                      <Slider
                        id="sensitivity"
                        label="Mouse sensitivity"
                        value={settings.mouseSensitivity}
                        min={1}
                        max={10}
                        suffix=""
                        onChange={(v) => updateSettings({ mouseSensitivity: v })}
                      />
                    )}

                    {tab === "region" && (
                      <Select
                        label="Server region"
                        value={settings.region}
                        onChange={(v) => updateSettings({ region: v })}
                      >
                        <option>EU West</option>
                        <option>EU East</option>
                        <option>US East</option>
                        <option>Asia</option>
                      </Select>
                    )}
                  </motion.div>
                </AnimatePresence>
              </div>
            </div>

            <div className="border-t border-border px-5 py-4">
              <button
                type="button"
                onClick={() => setSettingsOpen(false)}
                className="w-full rounded-lg bg-primary py-2.5 font-display text-sm font-bold uppercase tracking-wide text-primary-foreground transition-colors hover:bg-primary-hover"
              >
                Done
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
