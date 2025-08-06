// Rate limiting store for EVE ESI API
const rateLimitStore = new Map<string, { count: number; resetTime: number }>()

export default defineEventHandler(async (event) => {
  // Only apply to ESI API calls
  if (!event.node.req.url?.startsWith('/api/')) {
    return
  }

  const ip = getHeader(event, 'x-forwarded-for') || getHeader(event, 'x-real-ip') || event.node.req.socket.remoteAddress || 'unknown'
  const clientIp = Array.isArray(ip) ? ip[0] : ip
  const now = Date.now()
  const windowMs = 60 * 1000 // 1 minute
  const maxRequests = 100 // EVE ESI allows 150 requests per minute

  // Get current rate limit info for this IP
  const current = rateLimitStore.get(clientIp)
  
  if (!current || now > current.resetTime) {
    // Reset the counter
    rateLimitStore.set(clientIp, { count: 1, resetTime: now + windowMs })
  } else if (current.count >= maxRequests) {
    // Rate limit exceeded
    throw createError({
      statusCode: 429,
      statusMessage: 'Too Many Requests - Rate limit exceeded'
    })
  } else {
    // Increment counter
    current.count++
  }

  // Add rate limit headers
  setHeader(event, 'X-RateLimit-Limit', maxRequests.toString())
  setHeader(event, 'X-RateLimit-Remaining', (maxRequests - (current?.count || 0)).toString())
  setHeader(event, 'X-RateLimit-Reset', (current?.resetTime || now + windowMs).toString())
})
