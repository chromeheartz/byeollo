// 순수 계산만 모아 둔 파일. UI(index.html)와 테스트(logic.test.mjs)가 같이 쓴다.

/**
 * @typedef {{ id: string, name: string, lat: number, lng: number, category: string, date: string }} Visit
 */

/** @returns {number} 두 좌표 사이 거리(km) */
export function distKm(a, b) {
  const rad = Math.PI / 180
  const dLat = (b.lat - a.lat) * rad
  const dLng = (b.lng - a.lng) * rad
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(a.lat * rad) * Math.cos(b.lat * rad) * Math.sin(dLng / 2) ** 2
  return 2 * 6371 * Math.asin(Math.sqrt(h))
}

// 순서가 중요: 카카오는 "음식점 > 술집 > 호프" 처럼 오므로 술집을 식당보다 먼저 본다
const BUCKETS = [
  ['술집', /술집|주점|호프|이자카야|와인|칵테일|pub|\bbar\b/i],
  ['카페', /카페|커피|디저트|베이커리|제과|cafe|bakery|ice_cream/i],
  ['편의점', /편의점|convenience/i],
  ['식당', /음식점|식당|분식|한식|일식|중식|양식|restaurant|fast_food|food_court/i],
  ['문화', /문화|전시|공연|영화|서점|관광|공원|museum|cinema|theatre|attraction|park|books/i],
  ['쇼핑', /마트|백화점|쇼핑|의류|mall|supermarket|clothes|department/i],
]

/** @param {string} category @returns {string} */
export function bucket(category = '') {
  return BUCKETS.find(([, re]) => re.test(category))?.[0] ?? '기타'
}

/** @param {Visit[]} visits */
export function analyze(visits) {
  const sorted = [...visits].sort((a, b) => a.date.localeCompare(b.date))
  const byId = new Map()
  for (const v of sorted) {
    const prev = byId.get(v.id)
    byId.set(v.id, prev ? { ...prev, count: prev.count + 1 } : { ...v, count: 1, bucket: bucket(v.category) })
  }
  const stars = [...byId.values()]

  let diameter = 0
  for (const a of stars) for (const b of stars) diameter = Math.max(diameter, distKm(a, b))

  // 같은 가게를 연달아 찍으면 선이 생기지 않으므로 접는다
  const path = sorted.map((v) => v.id).filter((id, i, arr) => id !== arr[i - 1])

  const shares = {}
  for (const v of sorted) {
    const b = byId.get(v.id).bucket
    shares[b] = (shares[b] ?? 0) + 1 / sorted.length
  }
  const dominant = Object.entries(shares).sort((a, b) => b[1] - a[1])[0][0]
  const weekendDays = sorted.filter((v) => [0, 6].includes(new Date(`${v.date}T00:00`).getDay())).length

  return {
    stars,
    path,
    lines: path.length - 1,
    total: sorted.length,
    unique: stars.length,
    diameter,
    revisit: (sorted.length - stars.length) / sorted.length,
    weekend: weekendDays / sorted.length,
    shares,
    dominant,
    brightest: stars.reduce((a, b) => (b.count > a.count ? b : a)),
    from: sorted[0].date,
    to: sorted.at(-1).date,
  }
}

const PREFIX = { 카페: '커피향', 식당: '한끼', 술집: '심야안주', 편의점: '편의점', 문화: '산책', 쇼핑: '장바구니', 기타: '떠돌이' }

/** @returns {string} 자동 제안 별자리 이름 */
export function constellationName(a) {
  if (a.unique === 3) return '세모자리'
  return `${a.weekend >= 0.6 ? '주말' : ''}${PREFIX[a.dominant]}자리`
}

/** @returns {string[]} 결과 화면 멘트 */
export function remarks(a) {
  const b = a.brightest
  const reach = a.diameter < 1 ? '동네 밖은 위험해' : a.diameter < 5 ? '딱 마실 나가는 반경' : '이 정도면 거의 여행자'
  return [
    b.count >= 2 ? `가장 밝은 별은 ${b.name}. ${b.count}번이나 들렀어요` : `${a.unique}곳 모두 딱 한 번씩. 재방문은 아직 없어요`,
    `별자리 지름 ${a.diameter.toFixed(1)}km, ${reach}`,
    `${Math.round(a.weekend * 100)}%의 별이 주말에 떴어요`,
  ]
}
