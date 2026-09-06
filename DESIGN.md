# ELSEWHERE
Standalone cinematic landing page and functioning local demo. No dependencies on GovCon or other projects.

## Direction
A surreal nature atlas crossed with an approachable creative studio. The signature is a spectacular floating forest, supported by spacious oversized type and useful miniature editing controls. Main imagery is original generated concept artwork, not stock product screenshots.

## Tokens
Forest ink #091713; pine #163b2f; leaf #d9ff81; cloud #f3f5ed; fog #9eafa5; white #ffffff. Manrope with deliberately oversized, tightly set medium-weight headings; restrained small UI type. Main page full bleed cinematic hero, spacious off-white editorial body, dramatic green pricing and footer. Corners vary by role: pills for selections, modest rounded images, sharp text sections.

## Layout and actual interactions
Navigation / cinematic world selector / prompt composer / editorial intro / filterable world gallery / customization storyboard / pricing / FAQ / portal footer.
Studio dialog: editable name and prompt, environment preset, lighting range, atmosphere toggle, image view or lazily loaded live procedural 3D globe, save locally, export scene configuration.
Gallery: filters, favorites, scene details and saved scenes after reload. No remote account, checkout or AI generation claims. Prices illustrative, presets labelled.

## Reference
Mobbin creative tool sections inspected: Vizcom 998ec837-65e9-49f7-84f6-bcd40fbf480e (product previews as proof), Melius 3f4ed450-3eec-4694-acd7-5176809c4b32 (wide nature image and floating caption). Original layout and artwork.
https://mobbin.com/sites/sections/998ec837-65e9-49f7-84f6-bcd40fbf480e
https://mobbin.com/sites/sections/3f4ed450-3eec-4694-acd7-5176809c4b32
https://threejs.org/docs/
https://vite.dev/guide/

## Quality
360px to desktop, native modal focus containment, Escape close, focus restoration, reduced motion, sound opt-in, no fabricated testimonials or counts, graceful storage errors, local assets, browser E2E and visual inspection.

## Hero motion direction
The opening uses native scroll with a sticky desktop stage: scenery pushes inward while the headline recedes slightly, viewfinder accents frame the landscape, and a scene caption introduces the selected world. Video and still-image layers share the same motion values; playback controls remain outside transformed media. Small/short viewports keep natural document flow, and reduced-motion preferences remove the extended scroll stage. Primary actions stay visible rather than fading into invisible keyboard targets.
