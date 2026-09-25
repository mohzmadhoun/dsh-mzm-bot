/** Length-prefixed JSON frames over Shell↔Host duplex pipes (Gate B app bus). */

const MAX_FRAME_BYTES = 16 * 1024 * 1024

/**
 * Encode one JSON value as a u32be-length framed buffer.
 * @param value - JSON-serializable frame body.
 * @returns Framed bytes.
 */
export function encodeFramedJson(value: unknown): Buffer {
  const body = Buffer.from(JSON.stringify(value), 'utf8')
  const frame = Buffer.allocUnsafe(4 + body.byteLength)
  frame.writeUInt32BE(body.byteLength, 0)
  body.copy(frame, 4)
  return frame
}

/**
 * Write one framed JSON message to a stream.
 * @param stream - Framed-pipe writable end.
 * @param value - JSON-serializable frame body.
 */
export function writeFramedJson(stream: NodeJS.WritableStream, value: unknown): void {
  stream.write(encodeFramedJson(value))
}

/** Streaming decoder for u32be-length JSON frames. */
export class FramedJsonReader {
  private buffer = Buffer.alloc(0)

  /**
   * @param onMessage - Receives each complete JSON body.
   * @param onError - Receives framing/JSON failures (fail-closed).
   */
  constructor(
    private readonly onMessage: (value: unknown) => void,
    private readonly onError: (error: Error) => void,
  ) {}

  /**
   * Push incoming pipe bytes into the decoder.
   * @param chunk - Next readable chunk.
   */
  push(chunk: Buffer): void {
    this.buffer = Buffer.concat([this.buffer, chunk])
    for (;;) {
      if (this.buffer.byteLength < 4) return
      const length = this.buffer.readUInt32BE(0)
      if (length > MAX_FRAME_BYTES) {
        this.onError(new Error('desktop framed pipe: frame too large'))
        return
      }
      if (this.buffer.byteLength < 4 + length) return
      const body = this.buffer.subarray(4, 4 + length)
      this.buffer = this.buffer.subarray(4 + length)
      try {
        this.onMessage(JSON.parse(body.toString('utf8')) as unknown)
      } catch (error) {
        this.onError(error instanceof Error ? error : new Error(String(error)))
        return
      }
    }
  }
}
