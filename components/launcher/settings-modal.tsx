"use client"

import { motion, AnimatePresence } from "framer-motion"
import { X, Monitor, Volume2, MousePointer2, Globe } from "lucide-react"
import { useStore } from "@/lib/store"

function SectionTitle({ icon, children }: { icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="mb-3 flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-text-medium">
      {icon}
      {children}
    </div>
  )
}

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
  return (
    <div>
      <label htmlFor={id} className="mb-1.5 flex items-center justify-between text-sm text-text-high">
        <span>{label}</span>
        <span className="tabular-nums text-text-medium">
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
        className="h-2 w-full cursor-pointer appearance-none rounded-full bg-white/15 accent-primary"
      />
    </div>
  )
}

export function SettingsModal() {
  const settingsOpen = useStore((s) => s.settingsOpen)
  const setSettingsOpen = useStore((s) => s.setSettingsOpen)
  const settings = useStore((s) => s.settings)
  const updateSettings = useStore((s) => s.updateSettings)

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
            className="relative z-10 flex max-h-[85vh] w-full max-w-lg flex-col overflow-hidden rounded-2xl border border-border-strong bg-surface-2 shadow-2xl"
            initial={{ scale: 0.95, y: 12 }}
            animate={{ scale: 1, y: 0 }}
            exit={{ scale: 0.95, y: 12 }}
          >
            <div className="flex items-center justify-between border-b border-border px-5 py-4">
              <h2 className="font-display text-lg font-bold uppercase tracking-wide text-text-high">Settings</h2>
              <button
                type="button"
                onClick={() => setSettingsOpen(false)}
                aria-label="Close settings"
                className="rounded-md p-1.5 text-text-medium transition-colors hover:bg-white/10 hover:text-text-high"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="flex flex-col gap-6 overflow-y-auto p-5">
              {/* Display */}
              <section>
                <SectionTitle icon={<Monitor className="h-3.5 w-3.5" />}>Display</SectionTitle>
                <div className="flex flex-col gap-4">
                  <div className="flex items-center justify-between gap-4">
                    <span className="text-sm text-text-high">Resolution</span>
                    <select
                      aria-label="Resolution"
                      value={settings.resolution}
                      onChange={(e) => updateSettings({ resolution: e.target.value as typeof settings.resolution })}
                      className="rounded-md border border-border bg-surface px-2 py-1.5 text-sm text-text-high outline-none focus:border-primary"
                    >
                      <option value="1920x1080">1920 x 1080</option>
                      <option value="1366x768">1366 x 768</option>
                    </select>
                  </div>
                  <Slider
                    id="brightness"
                    label="Brightness"
                    value={settings.brightness}
                    onChange={(v) => updateSettings({ brightness: v })}
                  />
                  <div className="flex items-center justify-between gap-4">
                    <span className="text-sm text-text-high">Reduce animations</span>
                    <button
                      type="button"
                      role="switch"
                      aria-checked={settings.reduceAnimations}
                      aria-label="Reduce animations"
                      onClick={() => updateSettings({ reduceAnimations: !settings.reduceAnimations })}
                      className={`relative h-6 w-11 shrink-0 rounded-full transition-colors ${
                        settings.reduceAnimations ? "bg-primary" : "bg-white/15"
                      }`}
                    >
                      <span
                        className={`absolute top-0.5 h-5 w-5 rounded-full bg-white transition-transform ${
                          settings.reduceAnimations ? "translate-x-[22px]" : "translate-x-0.5"
                        }`}
                      />
                    </button>
                  </div>
                </div>
              </section>

              {/* Audio */}
              <section>
                <SectionTitle icon={<Volume2 className="h-3.5 w-3.5" />}>Audio</SectionTitle>
                <div className="flex flex-col gap-4">
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
                  <div className="flex items-center justify-between gap-4">
                    <span className="text-sm text-text-high">Output device</span>
                    <select
                      aria-label="Output device"
                      value={settings.outputDevice}
                      onChange={(e) => updateSettings({ outputDevice: e.target.value })}
                      className="rounded-md border border-border bg-surface px-2 py-1.5 text-sm text-text-high outline-none focus:border-primary"
                    >
                      <option>Speakers (Realtek)</option>
                      <option>Headset (HyperX)</option>
                      <option>Monitor (HDMI)</option>
                    </select>
                  </div>
                </div>
              </section>

              {/* Controls */}
              <section>
                <SectionTitle icon={<MousePointer2 className="h-3.5 w-3.5" />}>Controls</SectionTitle>
                <Slider
                  id="sensitivity"
                  label="Mouse sensitivity"
                  value={settings.mouseSensitivity}
                  min={1}
                  max={10}
                  suffix=""
                  onChange={(v) => updateSettings({ mouseSensitivity: v })}
                />
              </section>

              {/* Region */}
              <section>
                <SectionTitle icon={<Globe className="h-3.5 w-3.5" />}>Region</SectionTitle>
                <div className="flex items-center justify-between gap-4">
                  <span className="text-sm text-text-high">Server region</span>
                  <select
                    aria-label="Server region"
                    value={settings.region}
                    onChange={(e) => updateSettings({ region: e.target.value })}
                    className="rounded-md border border-border bg-surface px-2 py-1.5 text-sm text-text-high outline-none focus:border-primary"
                  >
                    <option>EU West</option>
                    <option>EU East</option>
                    <option>US East</option>
                    <option>Asia</option>
                  </select>
                </div>
              </section>
            </div>

            <div className="border-t border-border px-5 py-4">
              <button
                type="button"
                onClick={() => setSettingsOpen(false)}
                className="w-full rounded-lg bg-primary py-2.5 text-sm font-semibold uppercase tracking-wide text-primary-foreground transition-colors hover:bg-primary-hover"
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
