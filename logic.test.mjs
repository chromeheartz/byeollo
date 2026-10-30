// node logic.test.mjs
import assert from 'node:assert/strict'
import { analyze, constellationName, bucket, remarks, nearest } from './logic.js'

const v = (id, lat, lng, category, date) => ({ id, name: id, lat, lng, category, date })

// 여의도 카페 단골 3곳
const regular = analyze([
  v('바사', 37.5244, 126.9231, '음식점 > 카페', '2026-10-02'),
  v('샐러디', 37.5239, 126.9266, '음식점 > 양식', '2026-10-06'),
  v('바사', 37.5244, 126.9231, '음식점 > 카페', '2026-10-08'),
  v('호프', 37.521, 126.926, '음식점 > 술집 > 호프', '2026-10-14'),
  v('바사', 37.5244, 126.9231, '음식점 > 카페', '2026-10-15'),
])
assert.equal(regular.unique, 3)
assert.equal(regular.lines, 4)
assert.equal(regular.brightest.id, '바사')
assert.equal(constellationName(regular), '세모자리')
assert.equal(constellationName(regular, 'ja'), '三角座')

// 여의도 → 성수 → 홍대: 넓게 퍼짐
const wide = analyze([
  v('여의도', 37.5244, 126.9231, '카페', '2026-10-01'),
  v('성수', 37.5446, 127.0557, '식당', '2026-10-02'),
  v('홍대', 37.5563, 126.9236, '식당', '2026-10-03'),
])
assert.ok(wide.diameter > 10)

// 전부 첫 방문 → 재방문 0, 별 수 = 방문 수
const fresh = analyze([
  v('a', 37.52, 126.92, '음식점 > 한식', '2026-10-05'),
  v('b', 37.53, 126.93, '음식점 > 일식', '2026-10-06'),
  v('c', 37.54, 126.94, '문화시설', '2026-10-07'),
  v('d', 37.535, 126.95, '음식점 > 중식', '2026-10-08'),
])
assert.equal(fresh.revisit, 0)
assert.equal(fresh.unique, 4)

assert.equal(bucket('음식점 > 술집 > 호프,요리주점'), '술집')
assert.equal(bucket('amenity cafe'), '카페')
assert.equal(bucket(''), '기타')
assert.equal(bucket('amenity marketplace'), '쇼핑')
assert.equal(bucket('historic castle'), '문화')
assert.equal(bucket('커피숍 coffee_shop'), '카페')
assert.equal(bucket('편의점 convenience_store'), '편의점')
assert.equal(bucket('의류 매장 clothing_store'), '쇼핑')
assert.equal(bucket('바 bar'), '술집')
assert.equal(bucket('文化的ランドマーク cultural_landmark'), '문화')
assert.equal(bucket('ベーグル専門店 bagel_shop'), '카페')
assert.equal(bucket('点心店 dumpling_restaurant'), '식당')
assert.equal(bucket('マーケット market'), '쇼핑')
assert.ok(['食べ歩き座', '腹ペコ座', 'グルメ座'].includes(constellationName(fresh, 'ja')))
assert.equal(constellationName(wide), '세모자리')
const far = analyze([
  v('여의도', 37.5244, 126.9231, '카페', '2026-10-01'), v('성수', 37.5446, 127.0557, '카페', '2026-10-02'),
  v('잠실', 37.5133, 127.1001, '카페', '2026-10-03'), v('홍대', 37.5563, 126.9236, '카페', '2026-10-05'),
])
assert.equal(constellationName(far), '역마살자리')
const regular2 = analyze([...Array(4)].map((_, i) => v('바사', 37.5244, 126.9231, '카페', `2026-10-0${i + 1}`)).concat(v('호프', 37.521, 126.926, '술집', '2026-10-09')))
assert.equal(constellationName(regular2), '고인물자리')
assert.match(remarks(regular, 'ja')[0], /4回|3回/)
const near = nearest({ lat: 37.5446, lng: 127.0557 }, [{ lat: 37.5446, lng: 127.0560, n: '성수' }, { lat: 37.5563, lng: 126.9236, n: '홍대' }])
assert.equal(near.item.n, '성수')
assert.ok(near.km < 0.05)
assert.equal(nearest({ lat: 0, lng: 0 }, []), null)
console.log('ok')
