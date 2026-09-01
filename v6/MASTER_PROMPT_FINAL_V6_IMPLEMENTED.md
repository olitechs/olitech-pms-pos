# OliTechs Grand Hotel — Master Prompt Final V6

Implemented on the supplied Yellow/Black Contrast Add-on project.

## Theme
- #090C11 deep black
- #262B32 charcoal
- #202020 soft black
- #333533 grey black
- #FFD300 primary yellow
- #FFD100 deep sunflower
- #FFEE32 light yellow
- #F8F8F7 app background
- #FFFFFF cards
- #F2F2F2 secondary surface
- #E5E5E5 borders
- #757B81 muted text

## Room Planner
Room Planner is now included in the theme update. Reservation business logic is preserved:
- overlap prevention
- drag/drop and move confirmations
- joint/group reservations
- date range filtering
- Today positioning
- print preview/PDF
- guest/channel/meal/payment data

Payment bars now use:
- fully_paid: #090C11 background, #FFFFFF text, #FFD300 left accent
- partially_paid: #FFD300 background, #090C11 text, #FFD100 border
- not_paid: #757B81 background, #FFFFFF text, dashed #262B32 border
- checked_out: existing opacity/fade behavior

Footer summary is dark #202020 with high-contrast labels and themed stat values.

## Contrast
Added global `.btn-yellow`, `.btn-dark`, and `.btn-charcoal` utilities and removed existing primary yellow buttons using white text.
