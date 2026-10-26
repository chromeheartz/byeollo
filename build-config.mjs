// .env → config.js (브라우저가 읽는 설정). 로컬에선 .env, 배포에선 GitHub Actions의 secret이 환경변수로 들어옴
// 실행: node build-config.mjs
import { readFileSync, writeFileSync } from 'node:fs'

try { process.loadEnvFile('.env') } catch { /* .env 없음: 배포 환경이거나 키 없이 실행 */ }
const kakao = process.env.KAKAO_JS_KEY ?? ''
const google = process.env.GOOGLE_MAPS_KEY ?? ''
writeFileSync('config.js', `export const KAKAO_KEY = ${JSON.stringify(kakao)}\nexport const GOOGLE_KEY = ${JSON.stringify(google)}\n`)
console.log(`config.js: 카카오 ${kakao ? '있음' : '없음 (OSM 검색)'} · 구글 ${google ? '있음' : '없음 (사진 대신 미니맵)'}`)

// 배포 때만: index.html의 모듈 경로에 커밋 해시를 붙여서, 새 페이지가 캐시된 옛 모듈과 섞이지 않게
const sha = process.env.GITHUB_SHA?.slice(0, 7)
if (sha) {
  writeFileSync('index.html', readFileSync('index.html', 'utf8').replace(/'\.\/([\w-]+\.js)'/g, `'./$1?v=${sha}'`))
  console.log(`index.html: 모듈 경로에 ?v=${sha}`)
}
