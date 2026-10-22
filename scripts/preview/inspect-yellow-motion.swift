import Foundation
import AVFoundation
import AppKit

let path = CommandLine.arguments[1]
let output = CommandLine.arguments[2]
let asset = AVURLAsset(url: URL(fileURLWithPath: path))
let generator = AVAssetImageGenerator(asset: asset)
generator.appliesPreferredTrackTransform = true
generator.requestedTimeToleranceBefore = .zero
generator.requestedTimeToleranceAfter = .zero
let duration = CMTimeGetSeconds(asset.duration)
print("Encoded duration: \(duration) seconds")
for track in asset.tracks(withMediaType: .video) {
    print("Video: \(track.naturalSize), \(track.nominalFrameRate) fps")
}
let shift = CommandLine.arguments.count > 3 ? Double(CommandLine.arguments[3])! : 0
let samples = [0.5, 1.0, 4.1, 7.8, 10.2, 13.8, 17.4, 21.0, 24.6, 28.2, 32.7, 35.4, 36.7, 40.7, 42.3, 46.4, 47.8, 51.9].map { $0 + shift } + (shift > 0 ? [0, 0.2, 0.4, 0.6, 0.8] : [])
for seconds in samples {
    let image = try generator.copyCGImage(at: CMTime(seconds: seconds, preferredTimescale: 600), actualTime: nil)
    let bitmap = NSBitmapImageRep(cgImage: image)
    try bitmap.representation(using: .png, properties: [:])!.write(to: URL(fileURLWithPath: output + "/frame-\(seconds).png"))
}

let reader = try AVAssetReader(asset: asset)
let trackOutput = AVAssetReaderTrackOutput(track: asset.tracks(withMediaType: .video)[0], outputSettings: [kCVPixelBufferPixelFormatTypeKey as String: kCVPixelFormatType_32BGRA])
reader.add(trackOutput)
reader.startReading()
var count = 0
while trackOutput.copyNextSampleBuffer() != nil { count += 1 }
print("Decoded frames: \(count), reader status: \(reader.status.rawValue)")
if reader.status != .completed { fatalError("Video decode failed") }
