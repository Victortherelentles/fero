import React, { useEffect, useMemo, useRef, useState } from "react";

const TWO_PI = Math.PI * 2;

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function lerp(a, b, t) {
  return a + (b - a) * t;
}

function parseMusicUrl(input) {
  const value = input.trim();
  if (!value) return { platform: null, embedUrl: "", note: "Paste a YouTube or Spotify link." };

  try {
    const url = new URL(value);
    const host = url.hostname.replace(/^www\./, "");

    if (
      host === "youtube.com" ||
      host === "m.youtube.com" ||
      host === "music.youtube.com" ||
      host === "youtu.be"
    ) {
      let id = "";
      if (host === "youtu.be") id = url.pathname.slice(1);
      if (!id) id = url.searchParams.get("v") || "";
      if (!id && url.pathname.includes("/embed/")) id = url.pathname.split("/embed/")[1]?.split("/")[0] || "";
      if (!id && url.pathname.includes("/shorts/")) id = url.pathname.split("/shorts/")[1]?.split("/")[0] || "";

      if (!id) {
        return {
          platform: "youtube",
          embedUrl: "",
          note: "That YouTube link could not be parsed. Try a standard watch or share URL.",
        };
      }

      return {
        platform: "youtube",
        embedUrl: `https://www.youtube.com/embed/${id}?autoplay=1&controls=1&rel=0&playsinline=1`,
        note: "Play the embed, then use Enable tab audio for real reactivity.",
      };
    }

    if (host === "open.spotify.com") {
      const parts = url.pathname.split("/").filter(Boolean);
      const type = parts[0];
      const id = parts[1];
      const allowed = ["track", "album", "playlist", "episode", "show", "artist"];

      if (!type || !id || !allowed.includes(type)) {
        return {
          platform: "spotify",
          embedUrl: "",
          note: "That Spotify link could not be parsed. Try a track, playlist, album, or episode URL.",
        };
      }

      return {
        platform: "spotify",
        embedUrl: `https://open.spotify.com/embed/${type}/${id}?utm_source=generator&theme=0`,
        note: "Spotify embeds can drive the visuals if you capture tab audio.",
      };
    }

    return {
      platform: null,
      embedUrl: "",
      note: "Only YouTube and Spotify links are wired in for this prototype.",
    };
  } catch {
    return {
      platform: null,
      embedUrl: "",
      note: "That does not look like a valid URL yet.",
    };
  }
}

function buildSpikeCollection() {
  const layout = [
    { count: 5, radiusX: 54, radiusY: 16, baseWidth: 28, height: 182, lift: -34, jitter: 0.18 },
    { count: 7, radiusX: 108, radiusY: 34, baseWidth: 32, height: 208, lift: -12, jitter: 0.16 },
    { count: 9, radiusX: 170, radiusY: 56, baseWidth: 36, height: 186, lift: 8, jitter: 0.14 },
    { count: 10, radiusX: 230, radiusY: 82, baseWidth: 40, height: 154, lift: 24, jitter: 0.12 },
  ];

  const spikes = [];
  let id = 0;

  layout.forEach((ring, ringIndex) => {
    for (let i = 0; i < ring.count; i += 1) {
      const ratio = i / ring.count;
      const angle = ratio * TWO_PI - Math.PI / 2 + ringIndex * 0.11;
      const frontBias = Math.max(0, Math.sin(angle + Math.PI / 2));
      spikes.push({
        id: (id += 1),
        ring: ringIndex,
        angle,
        radiusX: ring.radiusX,
        radiusY: ring.radiusY,
        baseWidth: ring.baseWidth * (1 + frontBias * 0.08),
        height: ring.height * (1 + frontBias * 0.12),
        lift: ring.lift,
        phase: 0.9 + i * 0.66 + ringIndex * 1.1,
        jitter: ring.jitter,
      });
    }
  });

  spikes.push(
    { id: (id += 1), ring: 0, angle: -0.04, radiusX: 0, radiusY: 0, baseWidth: 44, height: 256, lift: -54, phase: 1.2, jitter: 0.12 },
    { id: (id += 1), ring: 0, angle: -0.58, radiusX: 64, radiusY: 18, baseWidth: 32, height: 192, lift: -26, phase: 2.1, jitter: 0.12 },
    { id: (id += 1), ring: 0, angle: 0.56, radiusX: 66, radiusY: 18, baseWidth: 33, height: 196, lift: -20, phase: 3.8, jitter: 0.12 },
    { id: (id += 1), ring: 0, angle: -1.18, radiusX: 118, radiusY: 24, baseWidth: 28, height: 170, lift: 4, phase: 4.6, jitter: 0.1 },
    { id: (id += 1), ring: 0, angle: 1.14, radiusX: 122, radiusY: 26, baseWidth: 28, height: 168, lift: 8, phase: 5.2, jitter: 0.1 },
  );

  return spikes;
}

function spikePath(x, baseY, width, height, lean, belly) {
  const left = x - width;
  const right = x + width;
  const tipX = x + lean;
  const tipY = baseY - height;
  const leftShoulderX = x - width * (0.64 + belly * 0.12);
  const rightShoulderX = x + width * (0.64 + belly * 0.12);
  const leftShoulderY = baseY - height * (0.24 + belly * 0.06);
  const rightShoulderY = baseY - height * (0.24 + belly * 0.06);
  const leftCurveX = x - width * (1.04 + belly * 0.1);
  const rightCurveX = x + width * (1.04 + belly * 0.1);
  const baseDip = width * (0.32 + belly * 0.08);

  return [
    `M ${left} ${baseY}`,
    `C ${leftCurveX} ${baseY - height * 0.1}, ${leftShoulderX} ${leftShoulderY}, ${tipX} ${tipY}`,
    `C ${rightShoulderX} ${rightShoulderY}, ${rightCurveX} ${baseY - height * 0.1}, ${right} ${baseY}`,
    `C ${x + width * 0.46} ${baseY + baseDip}, ${x - width * 0.46} ${baseY + baseDip}, ${left} ${baseY}`,
    "Z",
  ].join(" ");
}

function spikeSpecularPath(x, baseY, width, height, lean) {
  const startX = x - width * 0.42;
  const midX = x - width * 0.1;
  const tipX = x + lean * 0.42 - width * 0.02;
  const tipY = baseY - height * 0.92;
  const endX = x + width * 0.08;

  return [
    `M ${startX} ${baseY - height * 0.06}`,
    `C ${x - width * 0.3} ${baseY - height * 0.38}, ${midX} ${baseY - height * 0.62}, ${tipX} ${tipY}`,
    `C ${x + width * 0.04} ${baseY - height * 0.56}, ${endX} ${baseY - height * 0.18}, ${x - width * 0.08} ${baseY + width * 0.02}`,
    `C ${x - width * 0.18} ${baseY + width * 0.02}, ${x - width * 0.34} ${baseY - height * 0.02}, ${startX} ${baseY - height * 0.06}`,
    "Z",
  ].join(" ");
}

function spikeShadowPath(x, baseY, width, height, lean) {
  const startX = x - width * 0.06;
  const tipX = x + lean * 0.78 + width * 0.04;
  const tipY = baseY - height * 0.94;
  const endX = x + width * 0.52;

  return [
    `M ${startX} ${baseY - height * 0.06}`,
    `C ${x + width * 0.08} ${baseY - height * 0.32}, ${x + width * 0.24} ${baseY - height * 0.54}, ${tipX} ${tipY}`,
    `C ${x + width * 0.42} ${baseY - height * 0.44}, ${endX} ${baseY - height * 0.12}, ${x + width * 0.2} ${baseY + width * 0.04}`,
    `C ${x + width * 0.08} ${baseY + width * 0.02}, ${x + width * 0.02} ${baseY - height * 0.02}, ${startX} ${baseY - height * 0.06}`,
    "Z",
  ].join(" ");
}

export default function FerroFluidMusicPortal() {
  const [link, setLink] = useState("");
  const [embedUrl, setEmbedUrl] = useState("");
  const [platform, setPlatform] = useState(null);
  const [note, setNote] = useState("Paste a YouTube or Spotify link.");
  const [, setFrame] = useState(0);
  const [isCapturing, setIsCapturing] = useState(false);
  const [captureError, setCaptureError] = useState("");
  const [showPlayer, setShowPlayer] = useState(true);
  const [manualPulse, setManualPulse] = useState(0.18);

  const containerRef = useRef(null);
  const pointerRef = useRef({ x: 0.5, y: 0.5 });
  const analyserRef = useRef(null);
  const audioContextRef = useRef(null);
  const dataRef = useRef(null);
  const mediaStreamRef = useRef(null);
  const rafRef = useRef(0);
  const clockRef = useRef(0);
  const audioRef = useRef({ bass: 0.12, mid: 0.1, treble: 0.08, volume: 0.1 });

  const spikes = useMemo(() => buildSpikeCollection(), []);

  useEffect(() => {
    const animate = (time) => {
      clockRef.current = time * 0.001;

      const analyser = analyserRef.current;
      const dataArray = dataRef.current;
      if (analyser && dataArray) {
        analyser.getByteFrequencyData(dataArray);
        const len = dataArray.length;
        let bass = 0;
        let mid = 0;
        let treble = 0;
        let all = 0;

        for (let i = 0; i < len; i += 1) {
          const value = dataArray[i] / 255;
          all += value;
          if (i < len * 0.12) bass += value;
          else if (i < len * 0.45) mid += value;
          else treble += value;
        }

        bass /= Math.max(1, Math.floor(len * 0.12));
        mid /= Math.max(1, Math.floor(len * 0.33));
        treble /= Math.max(1, Math.floor(len * 0.55));
        all /= len;

        audioRef.current = {
          bass: lerp(audioRef.current.bass, bass, 0.18),
          mid: lerp(audioRef.current.mid, mid, 0.18),
          treble: lerp(audioRef.current.treble, treble, 0.18),
          volume: lerp(audioRef.current.volume, all, 0.16),
        };
      } else {
        const pulse = 0.08 + manualPulse * 0.72;
        audioRef.current = {
          bass: 0.18 + Math.sin(clockRef.current * 1.7) * 0.03 + pulse * 0.58,
          mid: 0.12 + Math.sin(clockRef.current * 1.1 + 1.3) * 0.03 + pulse * 0.34,
          treble: 0.09 + Math.sin(clockRef.current * 2.6 + 2.1) * 0.025 + pulse * 0.24,
          volume: 0.12 + pulse * 0.36,
        };
      }

      setFrame((value) => (value + 1) % 100000);
      rafRef.current = requestAnimationFrame(animate);
    };

    rafRef.current = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(rafRef.current);
  }, [manualPulse]);

  useEffect(() => {
    return () => {
      if (mediaStreamRef.current) {
        mediaStreamRef.current.getTracks().forEach((track) => track.stop());
      }
      if (audioContextRef.current) {
        audioContextRef.current.close().catch(() => {});
      }
    };
  }, []);

  const handleLoad = () => {
    const parsed = parseMusicUrl(link);
    setPlatform(parsed.platform);
    setEmbedUrl(parsed.embedUrl);
    setNote(parsed.note);
    setCaptureError("");
  };

  const enableTabAudio = async () => {
    setCaptureError("");
    try {
      const stream = await navigator.mediaDevices.getDisplayMedia({
        video: true,
        audio: {
          echoCancellation: false,
          noiseSuppression: false,
          sampleRate: 48000,
        },
      });

      const audioTracks = stream.getAudioTracks();
      if (!audioTracks.length) {
        stream.getTracks().forEach((track) => track.stop());
        throw new Error("No audio track was shared. Choose the current browser tab and enable Share tab audio.");
      }

      if (mediaStreamRef.current) {
        mediaStreamRef.current.getTracks().forEach((track) => track.stop());
      }
      mediaStreamRef.current = stream;

      if (!audioContextRef.current) {
        audioContextRef.current = new (window.AudioContext || window.webkitAudioContext)();
      }
      if (audioContextRef.current.state === "suspended") {
        await audioContextRef.current.resume();
      }

      const source = audioContextRef.current.createMediaStreamSource(stream);
      const analyser = audioContextRef.current.createAnalyser();
      analyser.fftSize = 2048;
      analyser.smoothingTimeConstant = 0.85;
      source.connect(analyser);
      analyserRef.current = analyser;
      dataRef.current = new Uint8Array(analyser.frequencyBinCount);
      setIsCapturing(true);

      stream.getVideoTracks().forEach((track) => {
        track.addEventListener("ended", () => {
          setIsCapturing(false);
          analyserRef.current = null;
          dataRef.current = null;
        });
      });
    } catch (error) {
      setCaptureError(error.message || "Audio capture failed in this browser.");
      setIsCapturing(false);
    }
  };

  const stopAudio = () => {
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach((track) => track.stop());
      mediaStreamRef.current = null;
    }
    analyserRef.current = null;
    dataRef.current = null;
    setIsCapturing(false);
  };

  const onPointerMove = (event) => {
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return;
    pointerRef.current = {
      x: clamp((event.clientX - rect.left) / rect.width, 0, 1),
      y: clamp((event.clientY - rect.top) / rect.height, 0, 1),
    };
  };

  const t = clockRef.current;
  const audio = audioRef.current;
  const px = pointerRef.current.x;
  const py = pointerRef.current.y;

  const hueA = 214 + audio.bass * 44 + audio.mid * 18;
  const hueB = 272 + audio.treble * 52 + audio.volume * 22;
  const hueC = 330 + audio.mid * 34 + audio.treble * 10;
  const hueD = 178 + audio.volume * 44;
  const centerX = 600 + (px - 0.5) * 28;
  const poolY = 612;
  const crownLift = -audio.bass * 10 - audio.volume * 7 + (0.5 - py) * 12;
  const causticOpacity = 0.15 + audio.treble * 0.22 + audio.volume * 0.09;
  const prismStrength = 0.44 + audio.treble * 0.24;
  const rippleGlow = 0.22 + audio.mid * 0.18;

  const spikeData = [...spikes]
    .map((spike) => {
      const orbitX = Math.cos(spike.angle + t * 0.025 + spike.ring * 0.045) * spike.radiusX;
      const orbitY = Math.sin(spike.angle) * spike.radiusY;
      const frontFactor = clamp((Math.sin(spike.angle) + 1) * 0.5, 0, 1);
      const microBob = Math.sin(t * (1.02 + spike.jitter) + spike.phase) * 4 + Math.cos(t * 0.66 + spike.phase * 1.7) * 3;
      const bassRise = audio.bass * (18 + spike.ring * 3.2);
      const x = centerX + orbitX + (px - 0.5) * (10 + spike.ring * 3.5);
      const baseY = poolY - 30 + orbitY + spike.lift + crownLift + microBob * 0.36;
      const width = spike.baseWidth * (1 + audio.mid * 0.14 + frontFactor * 0.08 + Math.sin(t * 0.7 + spike.phase) * 0.02);
      const height = spike.height * (1 + audio.bass * 0.26 + audio.volume * 0.12 + frontFactor * 0.08) + bassRise + microBob;
      const lean = (px - 0.5) * (7 + spike.ring * 1.6) + Math.sin(t * 0.52 + spike.phase) * 3.4;
      const belly = 0.6 + frontFactor * 0.4;
      const shadowScale = 1 + audio.volume * 0.16 + frontFactor * 0.1;
      const depth = baseY + spike.ring * 9 + frontFactor * 12;
      const fade = 0.72 + frontFactor * 0.28;
      return {
        ...spike,
        x,
        baseY,
        width,
        height,
        lean,
        belly,
        shadowScale,
        depth,
        fade,
        path: spikePath(x, baseY, width, height, lean, belly),
        specular: spikeSpecularPath(x, baseY, width, height, lean),
        shadowPath: spikeShadowPath(x, baseY, width, height, lean),
      };
    })
    .sort((a, b) => a.depth - b.depth);

  const droplets = Array.from({ length: 14 }, (_, index) => {
    const angle = (index / 14) * TWO_PI + t * 0.08;
    const rx = 182 + Math.sin(index * 1.6) * 20;
    const ry = 70 + Math.cos(index * 1.14) * 14;
    return {
      id: index,
      x: centerX + Math.cos(angle) * rx,
      y: poolY - 6 + Math.sin(angle) * ry * 0.5 + Math.sin(t * 1.1 + index) * 3,
      r: 4 + (index % 4) * 2 + audio.treble * 1.2,
    };
  });

  const rippleOffsets = [0, 28, 58, 92, 136, 188];

  return (
    <div
      ref={containerRef}
      className="min-h-screen w-full overflow-hidden bg-black text-white"
      onPointerMove={onPointerMove}
    >
      <style>{`
        * { box-sizing: border-box; }
        html, body, #root { min-height: 100%; background: #010103; }
        .site-grain::before {
          content: "";
          position: absolute;
          inset: -24%;
          background-image:
            radial-gradient(circle at 22% 20%, rgba(255,255,255,0.03) 0 1px, transparent 1px),
            radial-gradient(circle at 80% 34%, rgba(255,255,255,0.024) 0 1px, transparent 1px),
            radial-gradient(circle at 30% 82%, rgba(255,255,255,0.02) 0 1px, transparent 1px);
          background-size: 220px 220px, 170px 170px, 260px 260px;
          opacity: 0.24;
          mix-blend-mode: soft-light;
          pointer-events: none;
          animation: drift 18s linear infinite;
        }
        @keyframes drift {
          0% { transform: translate3d(0,0,0) scale(1); }
          50% { transform: translate3d(-1.2%, 1%, 0) scale(1.02); }
          100% { transform: translate3d(0,0,0) scale(1); }
        }
        .glass {
          backdrop-filter: blur(18px) saturate(135%);
          -webkit-backdrop-filter: blur(18px) saturate(135%);
          background: linear-gradient(180deg, rgba(255,255,255,0.08), rgba(255,255,255,0.03));
          border: 1px solid rgba(255,255,255,0.1);
          box-shadow:
            inset 0 1px 0 rgba(255,255,255,0.08),
            0 10px 45px rgba(0,0,0,0.55),
            0 0 90px rgba(90, 110, 255, 0.07);
        }
        .glass-shine {
          position: absolute;
          inset: 0;
          pointer-events: none;
          background:
            linear-gradient(125deg, rgba(255,255,255,0.12), rgba(255,255,255,0.02) 28%, transparent 46%),
            radial-gradient(circle at 20% 0%, rgba(255,255,255,0.1), transparent 32%);
          mix-blend-mode: screen;
          opacity: 0.76;
        }
        input::placeholder { color: rgba(255,255,255,0.38); }
        input:focus { outline: none; }
        .soft-ring {
          box-shadow: inset 0 0 0 1px rgba(255,255,255,0.08), 0 0 0 1px rgba(255,255,255,0.02);
        }
      `}</style>

      <div className="site-grain relative min-h-screen">
        <div
          className="absolute inset-0"
          style={{
            background: `
              radial-gradient(circle at 50% 53%, hsla(${hueB}, 76%, 14%, 0.18), transparent 18%),
              radial-gradient(circle at 28% 32%, hsla(${hueD}, 60%, 10%, 0.1), transparent 30%),
              radial-gradient(circle at 74% 34%, hsla(${hueC}, 62%, 10%, 0.1), transparent 28%),
              linear-gradient(180deg, #010103 0%, #03040a 50%, #020207 100%)
            `,
          }}
        />

        <div className="pointer-events-none absolute inset-0">
          <svg viewBox="0 0 1200 900" className="h-full w-full">
            <defs>
              <linearGradient id="chromeBody" x1="220" y1="180" x2="980" y2="760" gradientUnits="userSpaceOnUse">
                <stop offset="0%" stopColor={`hsla(${hueD}, 100%, 78%, ${0.72 + prismStrength * 0.08})`} />
                <stop offset="9%" stopColor={`hsla(${hueA}, 100%, 44%, 0.92)`} />
                <stop offset="18%" stopColor="rgba(252,254,255,0.98)" />
                <stop offset="28%" stopColor={`hsla(${hueB}, 100%, 52%, 0.92)`} />
                <stop offset="40%" stopColor="rgba(8,8,18,0.98)" />
                <stop offset="56%" stopColor={`hsla(${hueC}, 100%, 56%, 0.9)`} />
                <stop offset="74%" stopColor={`hsla(${hueD}, 100%, 60%, 0.9)`} />
                <stop offset="88%" stopColor={`hsla(${hueA + 12}, 100%, 64%, 0.88)`} />
                <stop offset="100%" stopColor="rgba(4,4,12,0.99)" />
              </linearGradient>

              <linearGradient id="chromeEdge" x1="320" y1="220" x2="920" y2="740" gradientUnits="userSpaceOnUse">
                <stop offset="0%" stopColor={`hsla(${hueD}, 100%, 92%, 0.82)`} />
                <stop offset="22%" stopColor={`hsla(${hueA}, 100%, 86%, 0.78)`} />
                <stop offset="48%" stopColor="rgba(255,255,255,0.98)" />
                <stop offset="74%" stopColor={`hsla(${hueC}, 100%, 82%, 0.74)`} />
                <stop offset="100%" stopColor={`hsla(${hueB}, 100%, 88%, 0.62)`} />
              </linearGradient>

              <linearGradient id="whiteSpecular" x1="470" y1="220" x2="730" y2="720" gradientUnits="userSpaceOnUse">
                <stop offset="0%" stopColor="rgba(255,255,255,0.98)" />
                <stop offset="22%" stopColor={`hsla(${hueD}, 100%, 86%, 0.92)`} />
                <stop offset="56%" stopColor={`hsla(${hueB}, 100%, 76%, 0.58)`} />
                <stop offset="100%" stopColor="rgba(255,255,255,0.03)" />
              </linearGradient>

              <linearGradient id="darkSlice" x1="360" y1="200" x2="930" y2="760" gradientUnits="userSpaceOnUse">
                <stop offset="0%" stopColor="rgba(0,0,0,0.06)" />
                <stop offset="36%" stopColor="rgba(4,4,14,0.24)" />
                <stop offset="64%" stopColor="rgba(0,0,0,0.52)" />
                <stop offset="100%" stopColor="rgba(0,0,0,0.08)" />
              </linearGradient>

              <radialGradient id="poolFill" cx="50%" cy="40%" r="78%">
                <stop offset="0%" stopColor={`hsla(${hueA + 8}, 100%, 76%, ${0.28 + audio.volume * 0.06})`} />
                <stop offset="14%" stopColor={`hsla(${hueB}, 100%, 54%, 0.72)`} />
                <stop offset="28%" stopColor={`hsla(${hueD}, 100%, 58%, 0.64)`} />
                <stop offset="44%" stopColor={`hsla(${hueC}, 100%, 56%, 0.7)`} />
                <stop offset="66%" stopColor={`hsla(${hueA}, 100%, 48%, 0.42)`} />
                <stop offset="100%" stopColor="rgba(2,4,12,0.98)" />
              </radialGradient>

              <radialGradient id="poolShadow" cx="50%" cy="50%" r="52%">
                <stop offset="0%" stopColor="rgba(0,0,0,0)" />
                <stop offset="100%" stopColor="rgba(0,0,0,0.72)" />
              </radialGradient>

              <radialGradient id="baseGlow" cx="50%" cy="50%" r="50%">
                <stop offset="0%" stopColor={`hsla(${hueD}, 100%, 88%, ${0.28 + audio.mid * 0.08})`} />
                <stop offset="45%" stopColor={`hsla(${hueB}, 100%, 68%, ${0.16 + audio.treble * 0.07})`} />
                <stop offset="100%" stopColor="rgba(255,255,255,0)" />
              </radialGradient>

              <filter id="softBloom" x="-60%" y="-60%" width="220%" height="220%">
                <feGaussianBlur stdDeviation="18" result="blur" />
                <feColorMatrix in="blur" type="matrix" values="1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 1.2 0" />
              </filter>

              <filter id="tightBloom" x="-40%" y="-40%" width="180%" height="180%">
                <feGaussianBlur stdDeviation="8" />
              </filter>

              <filter id="spikeDepth" x="-60%" y="-60%" width="220%" height="220%">
                <feDropShadow dx="0" dy="18" stdDeviation="16" floodColor="rgba(0,0,0,0.6)" />
                <feDropShadow dx="0" dy="0" stdDeviation="2.8" floodColor="rgba(255,255,255,0.12)" />
              </filter>

              <filter id="reflectionBlur" x="-60%" y="-60%" width="220%" height="220%">
                <feGaussianBlur stdDeviation="10" />
              </filter>

              <filter id="caustics" x="-60%" y="-60%" width="220%" height="220%">
                <feTurbulence
                  type="fractalNoise"
                  baseFrequency={`${0.01 + audio.treble * 0.008} ${0.074 + audio.mid * 0.018}`}
                  numOctaves="2"
                  seed="11"
                  result="noise"
                >
                  <animate attributeName="seed" values="11;18;11" dur="11s" repeatCount="indefinite" />
                </feTurbulence>
                <feColorMatrix
                  in="noise"
                  type="matrix"
                  values="1.7 0 0 0 0  0 1.8 0 0 0  0 0 2 0 0  0 0 0 1.1 -0.18"
                  result="lit"
                />
                <feGaussianBlur in="lit" stdDeviation="1.2" />
              </filter>

              <clipPath id="reflectionClip">
                <ellipse cx={centerX} cy={724} rx={364} ry={88} />
              </clipPath>
            </defs>

            <g opacity={0.82} filter="url(#softBloom)">
              <ellipse cx={centerX} cy={676} rx={290} ry={48} fill={`hsla(${hueB}, 100%, 54%, ${0.09 + audio.volume * 0.07})`} />
              <ellipse cx={centerX - 104} cy={670} rx={156} ry={32} fill={`hsla(${hueD}, 100%, 58%, ${0.08 + audio.mid * 0.05})`} />
              <ellipse cx={centerX + 124} cy={672} rx={176} ry={34} fill={`hsla(${hueC}, 100%, 58%, ${0.08 + audio.treble * 0.05})`} />
            </g>

            <g opacity={causticOpacity} filter="url(#caustics)" style={{ mixBlendMode: "screen" }}>
              <ellipse cx={centerX} cy={694} rx={396} ry={98} fill={`hsla(${hueB}, 100%, 74%, 0.5)`} />
            </g>

            <g opacity={0.95}>
              <ellipse cx={centerX} cy={642} rx={320} ry={92} fill="url(#poolFill)" />
              <ellipse cx={centerX} cy={650} rx={304} ry={86} fill="url(#poolShadow)" opacity={0.62} />
              <ellipse cx={centerX} cy={632} rx={248} ry={30} fill="url(#baseGlow)" filter="url(#softBloom)" opacity={0.88} />
            </g>

            <g opacity={0.78}>
              {rippleOffsets.map((offset, index) => (
                <ellipse
                  key={`ripple-${offset}`}
                  cx={centerX}
                  cy={648 + index * 5}
                  rx={176 + offset + audio.bass * 12}
                  ry={34 + offset * 0.18 + audio.volume * 3}
                  fill="none"
                  stroke={`hsla(${[hueA, hueB, hueC, hueD, hueA + 16, hueB + 12][index]}, 100%, ${74 + index * 2}%, ${0.14 + rippleGlow * 0.16})`}
                  strokeWidth={2.5 - index * 0.18}
                  filter="url(#tightBloom)"
                />
              ))}
            </g>

            <g clipPath="url(#reflectionClip)" opacity={0.56} filter="url(#reflectionBlur)">
              <g transform={`translate(0 ${poolY * 2 + 162}) scale(1 -0.72)`}>
                {spikeData.map((spike) => (
                  <g key={`reflect-${spike.id}`} opacity={0.38 + spike.fade * 0.16}>
                    <path d={spike.path} fill="url(#chromeBody)" />
                    <path d={spike.shadowPath} fill="url(#darkSlice)" opacity="0.54" />
                    <path d={spike.specular} fill="url(#whiteSpecular)" opacity="0.5" />
                  </g>
                ))}
                {droplets.map((drop) => (
                  <g key={`reflect-drop-${drop.id}`} opacity="0.3">
                    <circle cx={drop.x} cy={drop.y} r={drop.r} fill="url(#chromeBody)" />
                    <circle cx={drop.x - drop.r * 0.18} cy={drop.y - drop.r * 0.26} r={drop.r * 0.2} fill="rgba(255,255,255,0.7)" />
                  </g>
                ))}
              </g>
            </g>

            <g>
              {spikeData.map((spike) => (
                <ellipse
                  key={`shadow-${spike.id}`}
                  cx={spike.x}
                  cy={spike.baseY + 8}
                  rx={spike.width * spike.shadowScale * 0.92}
                  ry={spike.width * 0.22}
                  fill="rgba(0,0,0,0.46)"
                  filter="url(#tightBloom)"
                  opacity={0.5 + spike.fade * 0.18}
                />
              ))}
            </g>

            <g filter="url(#spikeDepth)">
              {spikeData.map((spike) => (
                <g key={spike.id} opacity={spike.fade}>
                  <path d={spike.path} fill="url(#chromeBody)" stroke="url(#chromeEdge)" strokeWidth={1.6 + audio.treble * 0.5} />
                  <path d={spike.shadowPath} fill="url(#darkSlice)" opacity={0.58} />
                  <path d={spike.specular} fill="url(#whiteSpecular)" opacity={0.96} />
                  <ellipse
                    cx={spike.x + spike.lean * 0.64}
                    cy={spike.baseY - spike.height * 0.96}
                    rx={spike.width * 0.1}
                    ry={spike.width * 0.05}
                    fill="rgba(255,255,255,0.95)"
                    filter="url(#tightBloom)"
                  />
                </g>
              ))}
            </g>

            <g>
              {droplets.map((drop) => (
                <g key={drop.id} opacity="0.92">
                  <circle cx={drop.x} cy={drop.y} r={drop.r} fill="url(#chromeBody)" stroke="url(#chromeEdge)" strokeWidth="1.1" />
                  <circle cx={drop.x - drop.r * 0.22} cy={drop.y - drop.r * 0.32} r={drop.r * 0.24} fill="rgba(255,255,255,0.88)" />
                </g>
              ))}
            </g>

            <g opacity={0.96}>
              <ellipse cx={centerX} cy={634} rx={330} ry={66} fill="url(#poolFill)" opacity={0.54} />
              <ellipse cx={centerX} cy={621} rx={252} ry={26} fill={`hsla(${hueD}, 100%, 88%, ${0.08 + prismStrength * 0.06})`} filter="url(#softBloom)" />
              <ellipse cx={centerX - 124} cy={626} rx={118} ry={12} fill={`hsla(${hueA}, 100%, 84%, 0.14)`} filter="url(#softBloom)" />
              <ellipse cx={centerX + 146} cy={629} rx={142} ry={14} fill={`hsla(${hueC}, 100%, 82%, 0.14)`} filter="url(#softBloom)" />
            </g>
          </svg>
        </div>

        <div className="absolute inset-x-0 top-0 flex justify-between px-5 py-5 text-[11px] uppercase tracking-[0.38em] text-white/36 sm:px-8">
          <div>Prismatic Ferrofluid</div>
          <div>{isCapturing ? "Live audio" : "Ambient mode"}</div>
        </div>

        <div className="relative z-10 flex min-h-screen items-end justify-center p-4 sm:p-8">
          <div className="glass relative w-full max-w-[860px] rounded-[30px] p-3 sm:p-4">
            <div className="glass-shine rounded-[30px]" />

            <div className="relative z-10 flex flex-col gap-3">
              <div className="flex flex-col gap-2 md:flex-row md:items-center">
                <div className="soft-ring flex h-14 flex-1 items-center rounded-[22px] bg-white/[0.035] px-4">
                  <input
                    value={link}
                    onChange={(event) => setLink(event.target.value)}
                    className="w-full bg-transparent text-sm text-white placeholder:text-white/40"
                    placeholder="Paste a YouTube or Spotify link"
                  />
                </div>

                <div className="flex gap-2">
                  <button
                    onClick={handleLoad}
                    className="h-14 rounded-[20px] border border-white/10 bg-white/[0.07] px-5 text-sm text-white transition hover:bg-white/[0.11]"
                  >
                    Load
                  </button>
                  <button
                    onClick={isCapturing ? stopAudio : enableTabAudio}
                    className="h-14 rounded-[20px] border border-white/10 bg-white px-5 text-sm font-medium text-black transition hover:opacity-90"
                  >
                    {isCapturing ? "Stop audio" : "Enable tab audio"}
                  </button>
                </div>
              </div>

              <div className="flex flex-col gap-3 text-xs text-white/58 md:flex-row md:items-center md:justify-between">
                <div className="max-w-[520px] leading-relaxed">
                  {note}
                  {captureError ? <span className="text-red-300"> {captureError}</span> : null}
                </div>

                <div className="flex items-center gap-3">
                  <span className="whitespace-nowrap text-white/38">Ambient pulse</span>
                  <input
                    type="range"
                    min="0"
                    max="1"
                    step="0.01"
                    value={manualPulse}
                    onChange={(event) => setManualPulse(Number(event.target.value))}
                    className="w-28 accent-white"
                  />
                  <button
                    onClick={() => setShowPlayer((value) => !value)}
                    className="rounded-full border border-white/10 bg-white/[0.06] px-3 py-1.5 text-[11px] uppercase tracking-[0.24em] text-white/70"
                  >
                    {showPlayer ? "Hide player" : "Show player"}
                  </button>
                </div>
              </div>

              {embedUrl && showPlayer ? (
                <div className="soft-ring overflow-hidden rounded-[24px] bg-black/30">
                  <div className="flex items-center justify-between border-b border-white/8 px-4 py-3 text-[11px] uppercase tracking-[0.34em] text-white/36">
                    <span>{platform}</span>
                    <span>Use the current tab audio to drive the ferrofluid</span>
                  </div>
                  <div className="aspect-[16/5] min-h-[170px] w-full bg-black/30">
                    <iframe
                      title="Embedded music player"
                      src={embedUrl}
                      className="h-full w-full"
                      allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
                      loading="lazy"
                    />
                  </div>
                </div>
              ) : null}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
