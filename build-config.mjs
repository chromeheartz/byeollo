// .env → config.js (브라우저가 읽는 설정). 로컬에선 .env, 배포에선 GitHub Actions의 secret이 환경변수로 들어옴
// 실행: node build-config.mjs
import { writeFileSync } from 'node:fs'

try { process.loadEnvFile('.env') } catch { /* .env 없음: 배포 환경이거나 키 없이 실행 */ }
const key = process.env.KAKAO_JS_KEY ?? ''
writeFileSync('config.js', `export const KAKAO_KEY = ${JSON.stringify(key)}\n`)
console.log(key ? 'config.js: 카카오 키 설정됨' : 'config.js: 카카오 키 없음 (OSM 검색으로 동작)')
