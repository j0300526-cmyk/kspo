# Third-party materials

## Application dependencies

- **Three.js**, MIT, https://github.com/mrdoob/three.js. WebGL renderer, loaders, scene and controls. The copyright/permission notice is included at `public/licenses/three.txt`.
- **Lucide**, ISC, https://github.com/lucide-icons/lucide. Interface icons. Notice included at `public/licenses/lucide.txt`.
- **Vite**, MIT, https://github.com/vitejs/vite. Build/dev tooling; its source license is installed with the package and recorded in the lockfile.
- **Happy DOM**, MIT, https://github.com/capricorn86/happy-dom. DOM tests only; not shipped as application runtime.
- **esbuild**, MIT, https://github.com/evanw/esbuild. Test bundling/build tooling; not shipped as application runtime.

## Data conversion tools

- NumPy, BSD-3-Clause, https://numpy.org/
- lxml, BSD-3-Clause, https://lxml.de/
- trimesh, MIT, https://github.com/mikedh/trimesh
- fast-simplification, MIT, https://github.com/pyvista/fast-simplification

These tools were used to convert the official venue data; they are not embedded in the website. See `scripts/convert-venue.py`, `scripts/convert-venue-finish.py`, and `docs/venue-data.md`.

## Public data

**한국체육산업개발주식회사_올림픽공원 공연장 실감형 콘텐츠**, https://www.data.go.kr/data/15127487/fileData.do

The portal lists “이용허락범위 제한 없음”. The website includes a simplified/transformed GLB derived from the official KSPO DOME DAE and geometry-derived observation points, with provenance, transformation, source checksum, and limitations in `docs/venue-data.md` and `public/models/venue-meta.json`. These data are separate from the MIT license on our authored application code. No endorsement by the provider is implied.

## Fonts

DM Sans and Noto Sans KR are requested from Google Fonts, under their respective SIL Open Font License terms. They are not included in the local application bundle; system font fallbacks are configured.
