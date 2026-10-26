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
  ['문화', /문화|전시|공연|영화|서점|관광|공원|고궁|museum|cinema|theatre|attraction|park|books|historic|tourism/i],
  ['쇼핑', /마트|백화점|쇼핑|의류|시장|mall|supermarket|clothes|department|marketplace|cosmetics/i],
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

/**
 * @template {{ lat: number, lng: number }} T
 * @returns {{ item: T, km: number } | null} 가장 가까운 항목과 거리
 */
export function nearest(p, items) {
  let best = null
  for (const item of items) {
    const km = distKm(p, item)
    if (!best || km < best.km) best = { item, km }
  }
  return best
}

/** @typedef {'ko' | 'ja'} Lang */

const NAMES = {
  ko: { 카페: '커피향', 식당: '한끼', 술집: '심야안주', 편의점: '편의점', 문화: '산책', 쇼핑: '장바구니', 기타: '떠돌이' },
  ja: { 카페: '珈琲', 식당: 'ごはん', 술집: '夜酒', 편의점: 'コンビニ', 문화: 'おさんぽ', 쇼핑: 'お買いもの', 기타: 'さすらい' },
}

/** @param {Lang} lang @returns {string} 자동 제안 별자리 이름 */
export function constellationName(a, lang = 'ko') {
  if (lang === 'ja') return a.unique === 3 ? '三角座' : `${a.weekend >= 0.6 ? '週末' : ''}${NAMES.ja[a.dominant]}座`
  return a.unique === 3 ? '세모자리' : `${a.weekend >= 0.6 ? '주말' : ''}${NAMES.ko[a.dominant]}자리`
}

/** @param {Lang} lang @returns {string[]} 결과 화면 멘트 */
export function remarks(a, lang = 'ko') {
  const b = a.brightest
  const km = a.diameter.toFixed(1)
  const pct = Math.round(a.weekend * 100)
  const tier = a.diameter < 1 ? 0 : a.diameter < 5 ? 1 : 2
  if (lang === 'ja') {
    return [
      b.count >= 2 ? `いちばん明るい星は${b.name}。${b.count}回も立ち寄りました` : `${a.unique}か所すべて一度ずつ。まだリピートはありません`,
      `星座の直径は${km}km、${['ご近所だけで完結', 'ちょうどお散歩の範囲', 'もはや旅人の距離'][tier]}`,
      `${pct}%の星が週末に輝きました`,
    ]
  }
  return [
    b.count >= 2 ? `가장 밝은 별은 ${b.name}. ${b.count}번이나 들렀어요` : `${a.unique}곳 모두 딱 한 번씩. 재방문은 아직 없어요`,
    `별자리 지름 ${km}km, ${['동네 밖은 위험해', '딱 마실 나가는 반경', '이 정도면 거의 여행자'][tier]}`,
    `${pct}%의 별이 주말에 떴어요`,
  ]
}
