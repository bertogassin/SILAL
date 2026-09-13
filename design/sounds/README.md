# si sounds

No third-party samples. Tones are generated in `src/lib/si/sounds.ts` with the Web Audio graph.

| Name | Spec | Implementation |
|---|---|---|
| `ui_tap` | wooden hit 40–60ms | triangle drop 220→90 Hz + short bandpass noise |
| `ui_success` | two soft rising notes | G4 then C5 sines |
| `ui_warn` | low string | E3 triangle + D3 sine |
| `tx_sent` | mountain motif ~0.6s | D4–F4–G4–A4 pentatonic |
| `invite_accepted` | same motif + overtone | motif with quiet octave triangle |

Volume follows the system. Toggle: settings → «az si». Respects `prefers-reduced-motion` by keeping envelopes short.
