const mapProto = Map.prototype as unknown as Record<string, unknown>

if (typeof mapProto.getOrInsertComputed !== 'function') {
  mapProto.getOrInsertComputed = function (
    this: Map<unknown, unknown>,
    key: unknown,
    compute: (key: unknown) => unknown
  ) {
    if (!this.has(key)) this.set(key, compute(key))
    return this.get(key)
  }
}

if (typeof mapProto.getOrInsert !== 'function') {
  mapProto.getOrInsert = function (this: Map<unknown, unknown>, key: unknown, value: unknown) {
    if (!this.has(key)) this.set(key, value)
    return this.get(key)
  }
}

const mathObj = Math as unknown as Record<string, unknown>

if (typeof mathObj.sumPrecise !== 'function') {
  mathObj.sumPrecise = (values: Iterable<number>): number => {
    let sum = 0
    let compensation = 0
    for (const value of values) {
      const next = sum + value
      compensation += Math.abs(sum) >= Math.abs(value) ? sum - next + value : value - next + sum
      sum = next
    }
    return sum + compensation
  }
}
