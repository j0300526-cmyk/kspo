# Third-party materials

## Application dependencies

- **Three.js**, MIT, https://github.com/mrdoob/three.js. WebGL renderer, loaders, scene and controls. The copyright/permission notice is included at `public/licenses/three.txt`.
- **Lucide**, ISC, https://github.com/lucide-icons/lucide. Interface icons. Notice included at `public/licenses/lucide.txt`.
- **Comlink**, Apache-2.0, https://github.com/GoogleChromeLabs/comlink. Worker RPC, notice at `public/licenses/comlink.txt`.
- **Zustand**, MIT, https://github.com/pmndrs/zustand. Vanilla application state, notice at `public/licenses/zustand.txt`.
- **Zod**, MIT, https://github.com/colinhacks/zod. Project/observation input validation, notice at `public/licenses/zod.txt`.
- **idb-keyval**, Apache-2.0, https://github.com/jakearchibald/idb-keyval. Async IndexedDB persistence, notice at `public/licenses/idb-keyval.txt`.
- **three-mesh-bvh**, MIT, https://github.com/gkjohnson/three-mesh-bvh. Spatial picking and worker-based index creation, notice at `public/licenses/three-mesh-bvh.txt`.
- **d3-polygon**, ISC, https://github.com/d3/d3-polygon. Convex boundary of public observation coordinates for the SVG map. Notice at `public/licenses/d3-polygon.txt`.
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

## Development tools

Prettier (MIT) formats authored modules. fake-indexeddb (Apache-2.0) supplies IndexedDB for tests only. Neither is shipped as application runtime. The workbench uses system fonts and does not request Google Fonts.

@resvg/resvg-js (MPL-2.0), https://github.com/yisibl/resvg-js, rasterizes the actual generated SVG for offline visual checks. This is development tooling and is not shipped in the application runtime.
