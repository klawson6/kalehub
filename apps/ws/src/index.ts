import { buildServer } from './server.js'

const port = Number(process.env['PORT'] ?? 3002)
const host = process.env['HOST'] ?? '0.0.0.0'

const { httpServer } = buildServer()

httpServer.listen(port, host, () => {
  console.log(`ws service listening on ${host}:${port}`)
})
