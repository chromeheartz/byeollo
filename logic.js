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
  ['술집', /술집|주점|호프|이자카야|와인|칵테일|居酒屋|バー|pub|\bbar\b/i],
  ['카페', /카페|커피|디저트|베이커리|제과|cafe|coffee|bakery|bagel|donut|ice_cream|dessert|tea_house|カフェ|喫茶|ベーカリー|ベーグル/i],
  ['편의점', /편의점|convenience|コンビニ/i],
  ['식당', /음식점|식당|분식|한식|일식|중식|양식|restaurant|fast_food|food_court|meal|diner|レストラン|料理|食堂/i],
  ['문화', /문화|전시|공연|영화|서점|관광|공원|고궁|museum|cinema|theatre|attraction|park|books|historic|tourism|landmark|cultural|monument|palace|temple|観光|史跡|名所|公園|博物館|美術館/i],
  ['쇼핑', /마트|백화점|쇼핑|의류|시장|mall|supermarket|clothes|department|marketplace|cosmetics|clothing|store|market|マーケット|市場|ショッピング/i],
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

// 가장 많이 간 종류별 이름 후보. 같은 가게 목록이면 늘 같은 이름이 나오게 가게 id로 하나 고름
const NAMES = {
  ko: {
    카페: ['얼죽아', '카공', '카페인수혈', '디저트배따로'],
    식당: ['먹짱', '맛집도장깨기', '웨이팅장인', '한입만'],
    술집: ['2차가', '짠', '해장필수', '불금'],
    편의점: ['편털', '신상털이', '1+1'],
    문화: ['갬성산책', '전시덕후', '사진맛집'],
    쇼핑: ['텅장', '지름신', '장바구니'],
    기타: ['정체불명', '자유영혼'],
  },
  ja: {
    카페: ['カフェ巡り', '喫茶', '甘党'],
    식당: ['食べ歩き', '腹ペコ', 'グルメ'],
    술집: ['はしご酒', '二次会', '乾杯'],
    편의점: ['コンビニ飯', '新作ハンター'],
    문화: ['映え', '観光', 'おさんぽ'],
    쇼핑: ['爆買い', '散財'],
    기타: ['迷子', '気まぐれ'],
  },
}

// 다닌 모양이 뚜렷하면 종류보다 먼저 붙는 이름 (위에서부터 먼저 맞는 것)
const SHAPES = [
  [(a) => a.unique === 3, { ko: '세모', ja: '三角' }],
  [(a) => a.revisit >= 0.5, { ko: '고인물', ja: '常連' }],
  [(a) => a.diameter < 0.8, { ko: '슬세권', ja: 'ご近所' }],
  [(a) => a.diameter > 15, { ko: '역마살', ja: '遠征' }],
  [(a) => a.unique >= 5 && a.shares[a.dominant] < 0.35, { ko: '극P', ja: '気まぐれ' }],
  [(a) => a.weekend >= 0.7, { ko: '주말한정', ja: '週末限定' }],
  [(a) => a.unique >= 5 && a.weekend === 0, { ko: '퇴근길', ja: '仕事帰り' }],
]

/** @param {Lang} lang @returns {string} 자동 제안 별자리 이름 */
export function constellationName(a, lang = 'ko') {
  const suffix = lang === 'ja' ? '座' : '자리'
  const shape = SHAPES.find(([test]) => test(a))
  if (shape) return shape[1][lang] + suffix
  const list = NAMES[lang][a.dominant]
  const seed = a.path.join('').split('').reduce((s, c) => s + c.charCodeAt(0), 0)
  return list[seed % list.length] + suffix
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
