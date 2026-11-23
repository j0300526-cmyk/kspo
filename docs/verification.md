# 배포 검증 기록

검사 시각: **2026-11-24 01:10:39 KST** (`2026-11-23T16:10:39.926Z`).

- 배포 주소: https://garim-zero-kspo-studio.hanwonjun.chatgpt.site
- 검사 대상 소스: [`6c321ff89b04adc59caff3aa272bcae879405398`](https://github.com/j0300526-cmyk/kspo/commit/6c321ff89b04adc59caff3aa272bcae879405398)
- 접근 방식: 기존 소유자 전용 권한을 유지한 인증 HTTP 요청.
- 이 기록은 해당 시점의 결과이며 지속적인 가용성 점검 결과가 아닙니다.

## HTTP와 파일 확인

| 경로 | HTTP | 응답 크기 |
| --- | --- | ---: |
| `/` | 200 | 1,709 B |
| `/assets/index-CbADlmu5.css` | 200 | 15,662 B |
| `/assets/index-wyk5FHI9.js` | 200 | 145,732 B |
| `/assets/analysis.worker-CY6Od8Uy.js` | 200 | 7,006 B |
| `/assets/scene-D-wdFjZ6.js` | 200 | 702,963 B |
| `/assets/generateMeshBVH.worker-DhOwA4h6.js` | 200 | 136,485 B |
| `/assets/ColladaLoader-Dcef7ecU.js` | 200 | 40,622 B |
| `/models/venue-meta.json` | 200 | 32,431 B |
| `/models/observation-points.json` | 200 | 843,591 B |
| `/models/kspo-dome.glb` | 200 | 18,484,888 B |

HTML은 호스팅 부트스트랩 삽입을 고려해 앱 진입 파일 참조를 비교했습니다. 나머지 응답 파일은 SHA-256으로 로컬 검증 빌드와 일치하는지 확인했습니다. 관찰점 JSON은 스키마를 검증했고 메타데이터 JSON은 파싱했습니다. GLB는 실제 Three.js GLTFLoader로 파싱해 메시 91개를 확인했습니다. 관찰점 7,382개의 ID 중복이 없음을 확인했습니다.

## 배포된 분석 워커 실행

배포 주소에서 내려받은 워커 번들을 Node Worker의 메시지 어댑터로 실행했습니다. 소스의 기본 무대·장비와 배포 관찰점을 입력으로 사용했습니다.

| 항목 | 결과 |
| --- | ---: |
| `ping()` | 정상 응답 |
| 분석 관찰점 | 7,382개 |
| 가림 발생 관찰점 | 3,072개 |
| 기본 배치 평균 가시율 | 89.532% |
| `camera-1` 위치 후보 비교 후 평균 가시율 | 90.012% |
| 장비를 모두 제거한 경우 가림 발생 | 0개 |

워커의 기본 분석 결과는 소스의 순수 계산 함수와 일치했습니다. 위치 후보 비교에서 기본값보다 가시율이 높은 결과가 반환됨을 확인했습니다. 이 수치는 검사 입력에 대한 계산값이며 실제 공연의 좌석별 가시율을 보증하지 않습니다.

## 자동 검증과 남은 범위

`npm test`의 18개 테스트와 `npm run build`가 통과한 소스를 배포했습니다. 자동 검증은 계산 커널·모델 파싱·입력 검증·앱 흐름·실제 Comlink Worker·복구·저장·자원 재사용을 포함합니다.

HTTP·파일 검사와 Node Worker 검사는 브라우저의 실제 WebGL 렌더링 검사가 아닙니다. 브라우저 연결 환경 문제로 화면 표시, 마우스 조작과 실제 FPS 확인은 미완료입니다. REST 서버 API와 기관 실시간 API 연동은 현재 앱에 구현되어 있지 않습니다.
