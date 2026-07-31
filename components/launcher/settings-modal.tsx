"use client"

import { motion, AnimatePresence } from "framer-motion"
import { icons, type LucideIcon } from '@/lib/icons'
import { useState } from "react"
import { LangSwitcher } from "@/components/lang-switcher"
import { Overlay } from "@/components/ui/overlay"
// The shared pair (F1.7) — same visuals as the local helpers below, but they
// carry `disabled` and a description line, which the interface-sound row needs.
// Aliased because this file still has its own `Slider`/`Toggle` for the rows the
// extraction has not reached yet.
import { Slider as RangeSlider } from "@/components/ui/slider"
import { Toggle as SwitchRow } from "@/components/ui/toggle"
import { useDismissableLayer } from "@/hooks/use-dismissable-layer"
import { useT } from "@/lib/i18n/provider"
import type { TKey } from "@/lib/i18n/types"
import { OVERLAY_MAX_H } from "@/lib/overlay"
import { useStore } from "@/lib/store"
import { cn } from "@/lib/utils"

type TabId = "display" | "audio" | "controls" | "region"

const TABS: { id: TabId; labelKey: TKey; icon: LucideIcon }[] = [
  { id: "display", labelKey: "settings.display", icon: icons.display },
  { id: "audio", labelKey: "settings.audio", icon: icons.volume },
  { id: "controls", labelKey: "settings.controls", icon: icons.controls },
  { id: "region", labelKey: "settings.region", icon: icons.language },
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
          checked ? "bg-primary" : "bg-border-strong",
        )}
      >
        <span
          className={cn(
            "absolute left-0.5 top-0.5 h-5 w-5 rounded-full bg-primary-foreground shadow transition-transform",
            checked ? "translate-x-5" : "translate-x-0",
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
  const { t } = useT()
  const [tab, setTab] = useState<TabId>("display")

  // C2.10 — settings is one of the four destinations of the profile menu, and it
  // was the only overlay in the shell that declared `role="dialog"` without ever
  // joining the shared layer stack. `Overlay` is geometry and a scrim; the
  // keyboard half has always been the panel's job (`ConfirmDialog` does exactly
  // this). Four things were missing, and the last one is the one that bites:
  //
  //   • **Escape did nothing.** The dialog you reach from the menu was the only
  //     one in the product you could not dismiss with the keyboard — the X and
  //     "Done" were the only ways out.
  //   • **No initial focus.** Focus stayed on whatever opened it — the menu
  //     trigger, or the profile's Settings button — i.e. *behind* the scrim, so
  //     the first Tab walked the launcher underneath instead of the dialog.
  //   • **No focus trap**, for the same reason: `aria-modal="true"` claimed the
  //     rest of the page was inert while Tab happily left it.
  //   • **The digit shortcuts stayed live.** `isLayerOpen()` reads this stack, so
  //     with settings open, pressing `2` navigated the launcher to the games
  //     library behind the dialog (F6.7). Body scroll was never locked either.
  //
  // All five defaults are right for a modal, so nothing is opted out of here.
  const panelRef = useDismissableLayer({
    open: settingsOpen,
    onClose: () => setSettingsOpen(false),
  })

  return (
    <Overlay open={settingsOpen} layer="modal" onDismiss={() => setSettingsOpen(false)}>
          <motion.div
            ref={panelRef}
            role="dialog"
            aria-modal="true"
            aria-label={t('settings.title')}
            // The panel is the trap's fallback target when it holds no focusable
            // control, so it has to be programmatically focusable — and then the
            // ring it would draw around the whole card has to go.
            tabIndex={-1}
            // Was `z-[60]`, the same rung the offline banner claimed — so during
            // an outage which of the two won depended on render order. The rung
            // now comes from the ladder, and `86vh` becomes the shared `svh` cap
            // so the header cannot leave the top of a short window (F6.4).
            className={cn(
              'tick-corners flex w-full max-w-2xl flex-col overflow-hidden rounded-xl border border-border-strong bg-surface-2 shadow-2xl outline-none',
              OVERLAY_MAX_H,
            )}
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
                  {t('settings.title')}
                </h2>
              </div>
              <button
                type="button"
                onClick={() => setSettingsOpen(false)}
                aria-label={t('settings.close')}
                className="relative rounded-md p-1.5 text-text-medium transition-colors hover:bg-white/10 hover:text-text-high"
              >
                <icons.close className="h-5 w-5" />
              </button>
            </div>

            <div className="flex min-h-0 flex-1 flex-col sm:flex-row">
              {/* Sidebar tabs */}
              <nav className="flex shrink-0 gap-1 overflow-x-auto border-b border-border p-2 sm:w-44 sm:flex-col sm:overflow-visible sm:border-b-0 sm:border-r sm:p-3">
                {TABS.map((item) => {
                  const Icon = item.icon
                  const active = tab === item.id
                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => setTab(item.id)}
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
                      <span className="relative">{t(item.labelKey)}</span>
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
                          <p className="mb-2 text-sm text-text-high">{t('settings.resolution')}</p>
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
                          label={t('settings.brightness')}
                          suffix="%"
                          value={settings.brightness}
                          onChange={(v) => updateSettings({ brightness: v })}
                        />
                        <Toggle
                          label={t('settings.reduceAnimations')}
                          checked={settings.reduceAnimations}
                          onChange={() => updateSettings({ reduceAnimations: !settings.reduceAnimations })}
                        />
                      </>
                    )}

                    {tab === "audio" && (
                      <>
                        <Slider
                          id="master"
                          label={t('settings.masterVolume')}
                          suffix="%"
                          value={settings.masterVolume}
                          onChange={(v) => updateSettings({ masterVolume: v })}
                        />
                        <Slider
                          id="game"
                          label={t('settings.gameVolume')}
                          suffix="%"
                          value={settings.gameVolume}
                          onChange={(v) => updateSettings({ gameVolume: v })}
                        />
                        <Slider
                          id="chat"
                          label={t('settings.chatVolume')}
                          suffix="%"
                          value={settings.chatVolume}
                          onChange={(v) => updateSettings({ chatVolume: v })}
                        />
                        <Select
                          label={t('settings.outputDevice')}
                          value={settings.outputDevice}
                          onChange={(v) => updateSettings({ outputDevice: v })}
                        >
                          <option>Speakers (Realtek)</option>
                          <option>Headset (HyperX)</option>
                          <option>Monitor (HDMI)</option>
                        </Select>

                        {/* F8.3 — the launcher's own cues, fenced off from the
                            three sliders above. Those belong to the machine
                            (game, chat, output device); this pair belongs to us,
                            and mixing them in one list is what makes a player
                            turn the wrong thing down. */}
                        <div className="flex flex-col gap-3 border-t border-border pt-4">
                          <p className="label-mono text-[10px] text-text-low">
                            {t('settings.interfaceGroup')}
                          </p>
                          <SwitchRow
                            label={t('settings.interfaceSounds')}
                            description={t('settings.interfaceSoundsHint')}
                            checked={settings.interfaceSounds}
                            onChange={(next) => updateSettings({ interfaceSounds: next })}
                          />
                          {/* Disabled rather than hidden when the cues are off:
                              a control that vanishes takes its remembered level
                              with it, and the player cannot see what they will
                              get back by switching sound on again. */}
                          <RangeSlider
                            id="interface-volume"
                            label={t('settings.interfaceVolume')}
                            suffix="%"
                            value={settings.interfaceVolume}
                            disabled={!settings.interfaceSounds}
                            onChange={(v) => updateSettings({ interfaceVolume: v })}
                          />
                        </div>
                      </>
                    )}

                    {tab === "controls" && (
                      <Slider
                        id="sensitivity"
                        label={t('settings.mouseSensitivity')}
                        value={settings.mouseSensitivity}
                        min={1}
                        max={10}
                        suffix=""
                        onChange={(v) => updateSettings({ mouseSensitivity: v })}
                      />
                    )}

                    {tab === "region" && (
                      <>
                        {/* Interface language (F2.5). The control itself decides
                            whether the pick is persisted, so this tab does not
                            branch on guest vs member — it only places it. */}
                        <LangSwitcher variant="rows" showLabel announce />
                        <Select
                          label={t("settings.serverRegion")}
                          value={settings.region}
                          onChange={(v) => updateSettings({ region: v })}
                        >
                          <option>EU West</option>
                          <option>EU East</option>
                          <option>US East</option>
                          <option>Asia</option>
                        </Select>
                      </>
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
                {t('common.done')}
              </button>
            </div>
          </motion.div>
    </Overlay>
  )
}
