"use client";

import { useRef, useEffect, useCallback, useState } from "react";
import { useI18n } from "@/i18n/I18nProvider";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useGSAP } from "@gsap/react";
import { PinContainer } from "@/components/ui/3d-pin";
import PhoneCountrySelect, { type Country } from "@/components/PhoneCountrySelect";
import { Turnstile } from "@marsidev/react-turnstile";

gsap.registerPlugin(ScrollTrigger);

/* ═══════════════════════════════════════════════════════════════
   LOCATION ↔ CONTACT  —  Orbital Scroll Transition
   ─────────────────────────────────────────────────────────────
   Scroll-driven cinematic sequence:

   Phase 0: Location visible immediately (no empty space).
   Phase 1 (0→0.12): Location content lifts up.
            Waves rise from bottom (back first, front with delay).
            Frame-animation canvas rises from bottom between waves.
   Phase 2 (0.12→0.35): Frame animation plays (slow start → normal).
            Background shifts navy → blue.
   Phase 3 (0.35→0.55): Location orbits LEFT (curved arc).
            Contact enters from RIGHT.
   Phase 4 (0.55→0.75): Hold — user reads Contact.
   Phase 5 (0.75→0.88): Exit for footer.
   ═══════════════════════════════════════════════════════════════ */

const TOTAL_FRAMES = 150;
const FRAME_PAD = 5; // WYSPA00000 format

const MAPS_HREF =
  "https://www.google.com/maps/place/Rena+Bianca+beach+bar/@41.2443727,9.1873002,17z";

function getFrameSrc(i: number) {
  return `/wyspa/WYSPA${String(i).padStart(FRAME_PAD, "0")}.png`;
}

// Custom easing for slow-start frames: first 30% of frames play in 60% of the timeline
function slowStartMap(progress: number): number {
  if (progress < 0.6) {
    // First 60% of scroll → first 30% of frames (slow)
    return (progress / 0.6) * 0.3;
  }
  // Remaining 40% of scroll → last 70% of frames (fast)
  return 0.3 + ((progress - 0.6) / 0.4) * 0.7;
}

export default function LocationContactTransition() {
  const { t, locale } = useI18n();
  const sectionRef = useRef<HTMLElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const imagesRef = useRef<HTMLImageElement[]>([]);
  const frameStepRef = useRef(1);
  const frameIdxRef = useRef({ value: 0 });
  // Auto-activates the 3D PinContainer while the location panel is
  // orbiting out of view — "tu jesteśmy" label + cyan pin appear by
  // themselves, no hover needed. Ref avoids re-renders; state lets
  // React propagate to <PinContainer forceActive=...>.
  const pinActiveRef = useRef(false);
  const [pinActive, setPinActive] = useState(false);
  const [formName, setFormName] = useState("");
  const [formEmail, setFormEmail] = useState("");
  const [formMessage, setFormMessage] = useState("");
  const [formPhone, setFormPhone] = useState<string | undefined>(undefined);
  const [selectedPhoneCountry, setSelectedPhoneCountry] = useState<Country | null>(null);
  const [formStatus, setFormStatus] = useState<"idle" | "loading" | "sent" | "error">("idle");
  const [turnstileToken, setTurnstileToken] = useState("");
  const [honeypot, setHoneypot] = useState("");
  const formOpenTimeRef = useRef<number>(Date.now());

  const handleContactSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formName || !formEmail || !formMessage) return;
    setFormStatus("loading");

    try {
      const phoneValue = formPhone?.replace(/[\s()-]+/g, "").trim() || "";
      const phoneDisplay = phoneValue || "Numero non fornito";
      const res = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: formName,
          email: formEmail,
          message: formMessage,
          phone: phoneValue,
          phoneDisplay,
          dialCode: phoneValue ? selectedPhoneCountry?.dial || "" : "",
          phoneCountry: phoneValue ? selectedPhoneCountry?.name || "" : "",
          phoneCountryIso: phoneValue ? selectedPhoneCountry?.iso || "" : "",
          language: locale,
          date: new Date().toISOString().split("T")[0],
          token: turnstileToken,
          hp: honeypot,
          formLoadedAt: formOpenTimeRef.current,
        }),
      });
      if (!res.ok) throw new Error("api failed");
      setFormStatus("sent");
      setFormName("");
      setFormEmail("");
      setFormMessage("");
      setFormPhone(undefined);
      setSelectedPhoneCountry(null);
      window.setTimeout(() => {
        setFormStatus("idle");
      }, 5000);
    } catch {
      setFormStatus("error");
    }
  };

  /* ── Lazy, staggered frame preloader ─────────────────────────
        The section uses 150 WYSPA PNGs (~100 MB total). Loading
        them all on first paint would slaughter mobile bandwidth
        and the LCP score — so instead:
          1. Allocate empty Image objects up-front (cheap, no net).
          2. Always fetch frame 0 immediately so the canvas has
             something to paint the moment the user reaches the
             section (avoids a white flash).
          3. Hold off the rest until an IntersectionObserver says
             the section is within ~2 viewports of the screen.
             Then stream the frames in small parallel batches so
             the connection doesn't get saturated.
        Net effect: landing page transfer drops by ~100 MB, and
        the frame sequence is always ready by the time the
        scroll-driven timeline actually reaches it. ── */
  useEffect(() => {
    /* On phones we only decode every THIRD frame — cuts the
       Znajdź-nas asset payload and reduces image-decode work.
       The frame step is resolved on the client only so SSR markup
       stays identical between server and browser. */
    const frameStep = window.innerWidth < 768 ? 3 : 1;
    frameStepRef.current = frameStep;
    const imgs: HTMLImageElement[] = new Array(TOTAL_FRAMES);
    for (let i = 0; i < TOTAL_FRAMES; i++) {
      imgs[i] = new Image();
      imgs[i].decoding = "async";
    }
    imagesRef.current = imgs;

    imgs[0].src = getFrameSrc(0);
    imgs[0].onload = () => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;
      canvas.width = imgs[0].naturalWidth;
      canvas.height = imgs[0].naturalHeight;
      ctx.drawImage(imgs[0], 0, 0);
    };

    let cancelled = false;
    let started = false;
    /* Streams frames in batches so we don't fire 149 parallel
       requests at once (slaughters mobile HTTP/1.1 connections).
       `FRAME_STEP` lets us skip every other frame on phones. */
    const startStreaming = () => {
      if (started || cancelled) return;
      started = true;
      const BATCH = 8;
      let next = frameStep;
      const pump = () => {
        if (cancelled) return;
        let inFlight = 0;
        const end = Math.min(next + BATCH * frameStep, TOTAL_FRAMES);
        for (let i = next; i < end; i += frameStep) {
          const img = imgs[i];
          if (!img.src) {
            inFlight++;
            const onDone = () => {
              inFlight--;
              if (inFlight === 0) pump();
            };
            img.onload = onDone;
            img.onerror = onDone;
            img.src = getFrameSrc(i);
          }
        }
        next = end;
        if (inFlight === 0 && next < TOTAL_FRAMES) pump();
      };
      pump();
    };

    const section = sectionRef.current;
    if (!section || typeof IntersectionObserver === "undefined") {
      startStreaming();
      return () => { cancelled = true; };
    }

    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (e.isIntersecting) {
            startStreaming();
            io.disconnect();
            break;
          }
        }
      },
      { rootMargin: "200% 0px 200% 0px" }
    );
    io.observe(section);
    return () => {
      cancelled = true;
      io.disconnect();
    };
  }, []);

  // #region agent log
  useEffect(() => {
  }, []);
  // #endregion

  const drawFrame = useCallback((idx: number) => {
    const canvas = canvasRef.current;
    const frameStep = frameStepRef.current;
    /* Snap to the nearest frame we actually loaded. On desktop
       `frameStep` is 1 so this is a no-op; on phones it rounds
       odd indices down to the preceding even frame that was
       actually fetched. If the chosen frame is still in flight
       we walk backwards until we find one that's decoded — so
       the canvas is NEVER blank once the first frame arrives. */
    let snapped = Math.floor(idx / frameStep) * frameStep;
    let img = imagesRef.current[snapped];
    while ((!img || !img.complete) && snapped > 0) {
      snapped -= frameStep;
      img = imagesRef.current[snapped];
    }
    if (!canvas || !img || !img.complete) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    if (canvas.width !== img.naturalWidth) canvas.width = img.naturalWidth;
    if (canvas.height !== img.naturalHeight) canvas.height = img.naturalHeight;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(img, 0, 0);
  }, []);

  useGSAP(
    () => {
      const section = sectionRef.current;
      if (!section) return;
      const isMobileDevice = window.innerWidth < 768;

      const waveBack = section.querySelector("[data-wave-back]") as HTMLElement;
      const waveFront = section.querySelector("[data-wave-front]") as HTMLElement;
      const framePlayer = section.querySelector("[data-frame-player]") as HTMLElement;
      const sceneWrap = section.querySelector("[data-location-scene]") as HTMLElement;
      const locationPanel = section.querySelector("[data-location]") as HTMLElement;
      const contactPanel = section.querySelector("[data-contact]") as HTMLElement;
      const headingLetters = section.querySelectorAll("[data-h-letter]");
      const formEls = section.querySelectorAll("[data-form-el]");
      /* "Sentence-by-sentence" reveal targets. Every logical line
         of the contact panel (eyebrow → heading → description →
         form name/email → message → submit) carries this data-attr
         so we can stagger them in after the panel lands at centre,
         brightening as they slide into place. */
      const contactLines = section.querySelectorAll("[data-contact-line]");
      const bgEl = section.querySelector("[data-bg]") as HTMLElement;

      if (!waveBack || !waveFront || !framePlayer || !sceneWrap || !locationPanel || !contactPanel) return;

      /* ═══════════════════════════════════════════════════════════════
         TIMELINE MAP (scroll progress 0 → 1)

         0.00 – 0.08   Waves rise: back wave first, front with delay
         0.08 – 0.18   Film rises between waves, first ~12% of frames
                       already playing (never shows a frozen poster)
         0.18 – 0.42   Film plays first half with slow-start ease-in/out
         0.42 – 0.62   MIDPOINT OF FILM ⇒ orbit swap starts
                       • Location panel curves OFF-SCREEN LEFT (moon
                         exits its sector) — rotation capped at −25°
                         so the panel never flips upside-down.
                       • Contact panel swings IN from the right along
                         a curved path, simultaneous with location's
                         departure.
                       • Film keeps playing to its last frame here.
         0.62 – 0.72   Contact fully visible, user reads. Film still
                       on its final frame, sitting centred.
         0.72 – 0.78   FILM slides down & off (Earth retreats).
         0.78 – 0.84   FRONT WAVE slides down & off.
         0.84 – 0.90   BACK WAVE slides down & off.
         0.90 – 1.00   Contact holds, then gently lifts for footer.
         ═══════════════════════════════════════════════════════════════ */

      // Initial states — location VISIBLE, waves + frame below screen, bg static
      // NOTE: transform-origin on sceneWrap kept as "center" so any tiny
      // tween never introduces a visual flip. No rotation is ever applied
      // to this wrap (waves + film stay perfectly upright).
      gsap.set(sceneWrap, { yPercent: 0, xPercent: 0, rotation: 0, transformOrigin: "center center" });
      // Waves start fully hidden BELOW the viewport so the very
      // first pixel of the section shows only the dark gradient
      // + location panel — no waves visible until they rise in
      // during Phase 1.
      gsap.set(waveBack, { yPercent: 130 });
      gsap.set(waveFront, { yPercent: 140 });
      gsap.set(framePlayer, { yPercent: 130 });
      // Location panel pivots from its own centre so the orbit curves
      // around its middle instead of one edge (fixes the old "flip"
      // feel caused by transform-origin: left center).
      gsap.set(locationPanel, {
        opacity: 1,
        yPercent: 0,
        xPercent: 0,
        scale: 1,
        rotation: 0,
        transformOrigin: "50% 50%",
      });
      gsap.set(contactPanel, { xPercent: 120, yPercent: 0, opacity: 0, rotation: 0, transformOrigin: "50% 50%" });
      // Phone reveal section starts hidden
      const phoneSection = section.querySelector("[data-phone-section]");
      const phoneLetters = section.querySelectorAll("[data-phone-letter]");
      const phoneBox = section.querySelector("[data-phone-box]");
      if (phoneSection) gsap.set(phoneSection, { autoAlpha: 1 });
      gsap.set(phoneLetters, { opacity: 0, y: 8 });
      if (phoneBox) gsap.set(phoneBox, { opacity: 0, y: 30 });
      gsap.set(headingLetters, { yPercent: 120 });
      /* All sentence blocks start DIM, slightly pushed down, and
         softly blurred — they'll snap into sharp, fully-bright
         focus one at a time in Phase 5b below. This also
         supersedes the previous formEls init (formEls is a
         subset of contactLines) so we keep a single source of
         truth for the reveal baseline. */
      gsap.set(contactLines, {
        opacity: 0,
        y: 26,
        filter: "blur(8px) brightness(0.45) saturate(0.7)",
      });
      gsap.set(formEls, { opacity: 0, y: 30 });

      /* Phone elements — GSAP owns the transform, not JSX inline style */
      gsap.set(section.querySelectorAll("[data-phone-letter]"), { opacity: 0, y: 8 });
      const _phoneBoxEl = section.querySelector("[data-phone-box]");
      if (_phoneBoxEl) gsap.set(_phoneBoxEl, { opacity: 0, y: 24 });

      const tl = gsap.timeline({
        scrollTrigger: {
          trigger: section,
          start: "top top",
          end: isMobileDevice ? "+=560%" : "+=900%",
          pin: true,
          scrub: isMobileDevice ? 0.3 : 0.5,
          anticipatePin: 1,
          /* Share the `"pinned"` group so this pin can never
             overlap with the menu-transition, panorama or gallery
             pins, and clamp fast swipes so the film + orbital
             animation always get a chance to play. Without these,
             a single hard swipe on mobile could fling the user
             past 6 × viewport of pinned scroll, skipping the
             entire "Znajdź nas" sequence. */
          fastScrollEnd: true,
          preventOverlaps: "pinned",
          invalidateOnRefresh: true,
          onUpdate: (self) => {
            // Auto-activate the 3D pin while the panel is orbiting away.
            const p = self.progress;
            const shouldActivate = p > 0.18 && p < 0.50;
            if (shouldActivate !== pinActiveRef.current) {
              pinActiveRef.current = shouldActivate;
              setPinActive(shouldActivate);
            }
          },
        },
      });

      /* ═══ Phase 1 (0.02 → 0.12): Waves rise — back first, then front.
            Start AFTER a tiny delay so the first scroll shows ONLY
            the dark gradient + location panel (no waves yet). ═══ */
      tl.to(waveBack, { yPercent: 55, duration: 0.08, ease: "power2.out" }, 0.02);
      tl.to(waveFront, { yPercent: 60, duration: 0.08, ease: "power2.out" }, 0.04);

      /* ═══ Phase 2 (0.10 → 0.18): Film rises between waves.
            First ~12% of frames already play so the canvas is
            alive the moment it peeks above the water line. ═══ */
      tl.to(framePlayer, { yPercent: 0, duration: 0.10, ease: "power2.out" }, 0.10);

      /* ═══ MASTER FRAME SEQUENCE (0 → 1)
            Strictly map frames 0-149 to the entire scroll 
            progress (0 to 1). ═══ */
      const LAST_FRAME = TOTAL_FRAMES - 1;
      
      tl.to(frameIdxRef.current, {
        value: LAST_FRAME,
        duration: 0.80, // Finish all frames at 80% of scroll to make room for cinematic ending
        ease: "none",
        onUpdate: () => {
          const idx = Math.round(frameIdxRef.current.value);
          drawFrame(Math.min(idx, LAST_FRAME));
        },
      }, 0);

      const ORBIT_START = 0.40;
      const ORBIT_DUR = 0.30; // Orbit ends at 0.70 (0.40 + 0.30)

      /* ── Background gradually lightens early during the film play ── */
      if (bgEl) {
        tl.to(bgEl, {
          background: "linear-gradient(180deg, #1a3a5c 0%, #2a7ab8 40%, #5ba3d9 75%, #8ec5e8 100%)",
          duration: 0.28,
          ease: "power1.inOut",
        }, 0.18);
      }

      /* ═══ Phase 4 (ORBIT_START → FILM_END): SYNCHRONIZED ORBIT SWAP
            Location orbits out to the LEFT while the Contact panel
            ENTERS FROM THE RIGHT in the **same scroll window**, and
            the canvas film plays its last 22 frames at the same time
            (Segment B above). Contact starts peeking in at frame 128
            and reaches its magnetic-centred position at frame 150.
            ORBIT_START / ORBIT_DUR are declared at the top of this
            useGSAP scope so both the film segments and the panel
            keyframes share identical timing. ═══ */

      // LOCATION: orbit out to the LEFT. The path curves UP first
      // (−y), then sweeps down and off-screen (+y). `sine.inOut`
      // between keyframes gives the arc a genuine circular feel.
      tl.to(locationPanel, {
        keyframes: [
          { xPercent: -20, yPercent: -8,  rotation: -8,  scale: 0.94, opacity: 0.92, duration: 0.22, ease: "sine.inOut" },
          { xPercent: -60, yPercent: -14, rotation: -18, scale: 0.82, opacity: 0.55, duration: 0.28, ease: "sine.inOut" },
          { xPercent: -110, yPercent: -6, rotation: -24, scale: 0.66, opacity: 0.2,  duration: 0.25, ease: "sine.inOut" },
          { xPercent: -160, yPercent: 8,  rotation: -25, scale: 0.5,  opacity: 0,    duration: 0.25, ease: "power1.in" },
        ],
        duration: ORBIT_DUR,
      }, ORBIT_START);

      /* CONTACT: one continuous flight from off-right → across the
         viewport → small overshoot past centre toward the LEFT →
         magnetic snap-back → settle exactly at x=0.

         Keyframe durations are fractions of the ORBIT_DUR window
         (they must sum to 1.0):
           0.00–0.35 — enter, travel to ~50% (approaching centre)
           0.35–0.60 — cross centre, fly to ~-8% (LEFT of centre)
                       → this is the "on the left" moment the user
                       asked for; magnetic lock ENGAGES here with
                       a tiny scale bloom (1.02).
           0.60–0.85 — gentle pull back to +1.5% with a micro
                       rebound in scale (the delicate magnet tug).
           0.85–1.00 — final settle to dead centre at scale 1.
      */
      tl.set(contactPanel, { opacity: 0, xPercent: 120, yPercent: 0, rotation: 8, scale: 1 }, ORBIT_START);
      const contactKeyframes = isMobileDevice
        ? [
            { xPercent: 72, yPercent: -3, rotation: 4, opacity: 0.45, duration: 0.32, ease: "sine.inOut" },
            { xPercent: 18, yPercent: -1, rotation: 1, opacity: 0.9, duration: 0.33, ease: "power2.out" },
            { xPercent: 0, yPercent: 0, rotation: 0, opacity: 1, scale: 1, duration: 0.35, ease: "power3.out" },
          ]
        : [
            { xPercent: 85, yPercent: -4, rotation: 6, opacity: 0.45, duration: 0.18, ease: "sine.inOut" },
            { xPercent: 50, yPercent: -2, rotation: 3, opacity: 0.85, duration: 0.17, ease: "sine.inOut" },
            { xPercent: -8, yPercent: -0.6, rotation: 0, opacity: 1, scale: 1.02, duration: 0.25, ease: "power3.out" },
            { xPercent: 1.5, yPercent: 0, scale: 0.996, duration: 0.25, ease: "sine.inOut" },
            { xPercent: 0, yPercent: 0, scale: 1, duration: 0.15, ease: "power2.out" },
          ];
      tl.to(contactPanel, {
        keyframes: contactKeyframes,
        duration: ORBIT_DUR,
      }, ORBIT_START);

      /* ═══ Phase 5 (FILM_END → +0.12): Scenery hides DOWN.
            Only AFTER the contact panel has locked to centre do the
            film player and waves retreat below the viewport, so the
            contact card owns the screen for the rest of the section. ═══ */
      const SCENERY_EXIT = ORBIT_START + ORBIT_DUR;        // 0.66
      tl.to(framePlayer, { yPercent: 130, duration: 0.06, ease: "power2.in" }, SCENERY_EXIT);
      tl.to(waveFront,   { yPercent: 140, duration: 0.06, ease: "power2.in" }, SCENERY_EXIT + 0.03);
      tl.to(waveBack,    { yPercent: 130, duration: 0.06, ease: "power2.in" }, SCENERY_EXIT + 0.06);

      /* ═══ Phase 5b — SENTENCE-BY-SENTENCE REVEAL, NOW SYNC'd
            WITH THE FILM + ORBIT.
            ──────────────────────────────────────────────────
            User report: the film and the rest of the "Znajdź
            nas" animation felt out of sync — the film would
            finish, the orbit would settle, THEN the contact
            lines would slowly brighten in as a separate beat.
            Fix: start the cascade just past the magnetic lock
            (ORBIT_START + 60% of ORBIT_DUR ≈ 0.588) so the
            lines finish revealing exactly at FILM_END (0.66).
            From the user's eye, the film, the orbit and the
            sentence reveal all complete in one synchronised
            beat — there is no longer any "wait, now read" gap.
            ── Math check (6 contact-line targets):
               start  + stagger * (n-1) + dur
             = 0.588 + 0.010 * 5         + 0.025
             = 0.663  ≈ FILM_END (0.66)  ✓ ═══ */
      const LINE_REVEAL_START = ORBIT_START + ORBIT_DUR * 0.50; // Starts midway through orbit
      const LINE_REVEAL_DUR = 0.025;
      const LINE_STAGGER = 0.010;

      tl.to(
        formEls,
        { opacity: 1, y: 0, duration: 0.001, ease: "none" },
        LINE_REVEAL_START
      );

      // The actual cascade.
      tl.to(
        contactLines,
        {
          opacity: 1,
          y: 0,
          filter: "blur(0px) brightness(1) saturate(1)",
          stagger: LINE_STAGGER,
          duration: LINE_REVEAL_DUR,
          ease: "power2.out",
        },
        LINE_REVEAL_START
      );

      // Heading letters still rise letter-by-letter, but now
      // tightened so all of them finish RISING before FILM_END
      // (0.66) — the heading is the SECOND data-contact-line,
      // hence one stagger-beat after the eyebrow.
      tl.to(
        headingLetters,
        {
          yPercent: 0,
          stagger: 0.003,
          duration: 0.04,
          ease: "expo.out",
        },
        LINE_REVEAL_START + LINE_STAGGER
      );

      /* ═══ Phase 6: CINEMATIC CENTERING
            Happens AFTER ALL scenery has fully exited.
            Scenery starts exit at 0.70 and is fully gone at 0.82.
            Centering starts as the hero beat of the end. ═══ */
      const MAGNET_START = 0.84; 
      const MAGNET_DUR = 0.06;

      const contactWrapper = section.querySelector("[data-contact-wrap]") as HTMLElement;
      const contactInner = section.querySelector("[data-contact-inner]") as HTMLElement;

      // Calculate the exact pixel offset to centre the card in
      // the viewport. The card sits flush-left inside max-w-5xl.
      // offset = (innerWidth - cardWidth) / 2
      let centreX = 0;
      if (contactInner && contactWrapper) {
        centreX = (contactInner.offsetWidth - contactWrapper.offsetWidth) / 2;
      }

      // Bouncy magnetic slide to dead-centre
      if (contactWrapper && centreX > 0 && !isMobileDevice) {
        tl.to(contactWrapper, {
          x: centreX,
          duration: MAGNET_DUR,
          ease: "back.out(1.7)",
        }, MAGNET_START);
      }

      // Card background darkens + glow intensifies
      if (contactWrapper) {
        tl.to(contactWrapper, {
          backgroundColor: "rgba(10, 25, 47, 0.72)",
          borderColor: "rgba(59, 130, 196, 0.22)",
          boxShadow: "0 0 80px rgba(59,130,196,0.15), 0 0 30px rgba(59,130,196,0.06), inset 0 1px 0 rgba(255,255,255,0.10)",
          duration: MAGNET_DUR,
          ease: "power2.inOut",
        }, MAGNET_START);
      }

      // Text lines brighten
      tl.to(
        contactLines,
        {
          filter: "blur(0px) brightness(1.15) saturate(1.15)",
          duration: MAGNET_DUR,
          ease: "power2.out",
        },
        MAGNET_START
      );

      /* ═══ Phase 7 (MAGNET end → +0.04): PHONE REVEAL
            Letter-by-letter the phone prompt text appears,
            then the phone input slides up from below. ═══ */
      const PHONE_START = MAGNET_START + (isMobileDevice ? 0.025 : 0.005);
      const PHONE_TEXT_DUR = 0.03;
      const PHONE_BOX_DUR = 0.02;

      // Letter-by-letter reveal of phone prompt text
      const phoneLettersAnim = section.querySelectorAll("[data-phone-letter]");
      const phoneBoxAnim = section.querySelector("[data-phone-box]");

      if (phoneLettersAnim.length > 0) {
        tl.to(
          phoneLettersAnim,
          {
            opacity: 1,
            y: 0,
            stagger: 0.0008,  // very rapid letter-by-letter
            duration: 0.005,
            ease: "power2.out",
          },
          PHONE_START
        );
      }

      // Phone input box slides up from below
      if (phoneBoxAnim) {
        tl.to(
          phoneBoxAnim,
          {
            opacity: 1,
            y: 0,
            duration: PHONE_BOX_DUR,
            ease: "back.out(1.4)",
          },
          PHONE_START + PHONE_TEXT_DUR * 0.6  // overlap with tail end of text
        );
      }

      /* ═══ Phase 8 (remaining → 1.00): HOLD — form stays centred,
            user reads and interacts. ═══ */
    },
    { scope: sectionRef }
  );

  return (
    <section
      id="contact"
      ref={sectionRef}
      className="relative h-dvh w-full overflow-hidden"
      style={{ background: "#0A192F" }}
    >
      <div id="reservation" className="pointer-events-none absolute left-0 top-0 h-px w-px" />

      {/* Background layer for color animation */}
      <div data-bg className="absolute inset-0" style={{ background: "#0A192F" }} />

      <div data-location-scene className="absolute inset-0 will-change-transform">
      {/* ═══ BACK WAVE (taller, behind) ═══ */}
      <div
        data-wave-back
        className="pointer-events-none absolute inset-x-0 bottom-0 z-2 will-change-transform"
        style={{ height: "25%" }}
      >
        <svg
          viewBox="0 24 150 28"
          preserveAspectRatio="none"
          className="absolute inset-x-0 top-0 h-20 w-full -translate-y-full"
        >
          <defs>
            <path id="lct-wave-back" d="M-160 44c30 0 58-18 88-18s 58 18 88 18 58-18 88-18 58 18 88 18 v44h-352z" />
          </defs>
          <g className="lct-wave-back-g">
            <use xlinkHref="#lct-wave-back" x="48" y="0" fill="rgba(26,74,110,0.4)" />
            <use xlinkHref="#lct-wave-back" x="48" y="3" fill="rgba(26,74,110,0.6)" />
            <use xlinkHref="#lct-wave-back" x="48" y="5" fill="rgba(26,74,110,0.85)" />
            <use xlinkHref="#lct-wave-back" x="48" y="7" fill="#1a4a6e" />
          </g>
        </svg>
        <div className="h-full w-full" style={{ background: "linear-gradient(180deg, #1a4a6e 0%, #0d2240 100%)" }} />
      </div>

      {/* ═══ FRAME PLAYER — 1920×1080 original ratio, rises from below waves.
              Anchored high in the viewport on every breakpoint so the
              frame sits ABOVE the waves and well clear of any bottom
              overlays (user explicitly asked for it to sit higher like
              it did originally). ═══ */}
      <div
        data-frame-player
        className="absolute bottom-[6%] left-1/2 z-3 w-[126%] -translate-x-1/2 overflow-hidden will-change-transform md:inset-x-0 md:bottom-0 md:left-0 md:w-full md:translate-x-0"
        style={{ aspectRatio: "1920/1080" }}
      >
        <canvas
          ref={canvasRef}
          className="block h-full w-full object-cover"
        />
      </div>

      {/* ═══ FRONT WAVE (shorter, in front of frame player) ═══ */}
      <div
        data-wave-front
        className="pointer-events-none absolute inset-x-0 bottom-0 z-4 will-change-transform"
        style={{ height: "18%" }}
      >
        <svg
          viewBox="0 24 150 28"
          preserveAspectRatio="none"
          className="absolute inset-x-0 top-0 h-16 w-full -translate-y-full"
        >
          <defs>
            <path id="lct-wave-front" d="M-160 44c30 0 58-18 88-18s 58 18 88 18 58-18 88-18 58 18 88 18 v44h-352z" />
          </defs>
          <g className="lct-wave-front-g">
            <use xlinkHref="#lct-wave-front" x="48" y="0" fill="rgba(59,130,196,0.3)" />
            <use xlinkHref="#lct-wave-front" x="48" y="3" fill="rgba(59,130,196,0.5)" />
            <use xlinkHref="#lct-wave-front" x="48" y="5" fill="rgba(59,130,196,0.75)" />
            <use xlinkHref="#lct-wave-front" x="48" y="7" fill="#3B82C4" />
          </g>
        </svg>
        <div className="h-full w-full" style={{ background: "linear-gradient(180deg, #3B82C4 0%, #1a4a6e 60%, #0d2240 100%)" }} />
      </div>

      {/* ═══ LOCATION PANEL — visible immediately. Pivots from centre
           so the orbital exit curves around the panel's middle. ═══ */}
      <div
        data-location
        className="absolute inset-0 z-10 flex items-center justify-center will-change-transform"
      >
        <div className="mx-auto w-full max-w-5xl px-6 sm:px-10">
          <div className="grid grid-cols-1 items-center gap-8 md:grid-cols-2 md:gap-12">
            {/* Left: heading + info */}
            <div>
              <span className="mb-3 block font-body text-xs uppercase tracking-[0.3em] text-sand/40">
                {t("location.label")}
              </span>
              <h2
                className="font-heading text-3xl text-sand sm:text-4xl md:text-5xl lg:text-6xl"
                style={{ fontWeight: 400 }}
              >
                {t("location.heading")}
              </h2>

              <div className="mt-8 space-y-5 font-body text-sm leading-relaxed text-sand/60 sm:text-base">
                <div>
                  <span className="mb-2 block text-[10px] font-medium uppercase tracking-[0.2em] text-sand/30 sm:text-xs">{t("location.address.label")}</span>
                  <p>
                    Spiaggia di Rena Bianca<br />
                    07028 Santa Teresa Gallura<br />
                    {t("location.country")}
                  </p>
                </div>

                <div className="h-px w-16" style={{ background: "linear-gradient(90deg, rgba(59,130,196,0.3), transparent)" }} />

                <div className="grid grid-cols-2 gap-6">
                  <div>
                    <span className="mb-2 block text-[10px] font-medium uppercase tracking-[0.2em] text-sand/30 sm:text-xs">{t("location.hours.label")}</span>
                    <p>{t("location.hours.value")}<br />10:00 – 01:00</p>
                  </div>
                  <div>
                    <span className="mb-2 block text-[10px] font-medium uppercase tracking-[0.2em] text-sand/30 sm:text-xs">{t("location.phone.label")}</span>
                    <p>
                      +39 0789 123 456<br />
                      info@renabiancabeachbar.com
                    </p>
                  </div>
                </div>
              </div>

              <a
                href={MAPS_HREF}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-8 inline-flex w-fit items-center gap-2.5 rounded-full border border-ocean/30 bg-ocean/10 px-6 py-3 font-body text-xs font-medium uppercase tracking-wider text-sand/80 transition-all duration-300 hover:border-ocean/50 hover:bg-ocean/20 hover:text-sand sm:text-sm"
              >
                <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                  <path d="M7 1C4.79 1 3 2.79 3 5c0 3.5 4 8 4 8s4-4.5 4-8c0-2.21-1.79-4-4-4zm0 5.5A1.5 1.5 0 1 1 7 3.5a1.5 1.5 0 0 1 0 3z" fill="currentColor" />
                </svg>
                {t("location.navigate")}
              </a>
            </div>

            {/* Right: full map wrapped in Aceternity 3D PinContainer — 
                 on hover the card tilts on the X-axis (40deg) and the
                 cyan pin + radar pulses appear above it. */}
            <div className="relative flex min-h-[360px] items-center justify-center md:min-h-[420px]">
              <PinContainer
                title="Tu jesteśmy — Rena Bianca"
                href={MAPS_HREF}
                containerClassName="w-full max-w-[440px]"
                forceActive={pinActive}
              >
                <div className="flex w-[260px] flex-col sm:w-[320px] md:w-[380px]">
                  <div className="overflow-hidden rounded-xl" style={{ aspectRatio: "4/3" }}>
                    <iframe
                      src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d2999.9625941782574!2d9.187300176560825!3d41.24437270485302!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x12dbdff7fdbdfccd%3A0xa5f00b556e3e9542!2sRena%20Bianca%20beach%20bar!5e0!3m2!1spl!2spl!4v1776225511084!5m2!1spl!2spl"
                      className="h-full w-full border-0"
                      style={{ filter: "grayscale(0.5) contrast(1.1) brightness(0.8) hue-rotate(190deg)", pointerEvents: "none" }}
                      loading="lazy"
                      referrerPolicy="no-referrer-when-downgrade"
                      title="Rena Bianca – mapa"
                    />
                  </div>
                  <div className="px-1 pb-1 pt-3">
                    <h3 className="font-heading text-sm text-sand sm:text-base" style={{ fontWeight: 500 }}>
                      Rena Bianca Beach Bar
                    </h3>
                    <p className="mt-1 font-body text-xs text-sand/50 sm:text-sm">
                      Spiaggia di Rena Bianca, Santa Teresa Gallura
                    </p>
                  </div>
                </div>
              </PinContainer>
            </div>
          </div>
        </div>
      </div>
      </div>

      {/* ═══ CONTACT PANEL (enters from right) ═══ */}
      <div
        data-contact
        className="absolute inset-0 z-20 flex items-center will-change-transform"
      >
        <div data-contact-inner className="mx-auto w-full max-w-5xl px-4 sm:px-8 md:px-14">
          <div
            data-contact-wrap
            className="w-full max-w-lg overflow-visible rounded-2xl border border-white/8 bg-white/3 p-5 sm:p-7 md:p-9 backdrop-blur-md will-change-transform"
            style={{
              boxShadow: "0 0 40px rgba(59,130,196,0.06), inset 0 1px 0 rgba(255,255,255,0.05)",
            }}
          >
            <span
              data-contact-line
              className="mb-3 block font-body text-[10px] uppercase tracking-[0.3em] text-ocean/60 sm:text-xs"
              style={{ willChange: "filter, transform, opacity" }}
            >
              {t("contact.label")}
            </span>
            <h2
              data-contact-line
              className="font-heading text-2xl text-sand sm:text-3xl md:text-4xl lg:text-5xl"
              style={{ fontWeight: 400, lineHeight: 1.1, willChange: "filter, transform, opacity" }}
            >
              {t("contact.heading").split("").map((ch: string, i: number) => (
                <span key={i} className="inline-block overflow-hidden">
                  <span data-h-letter className="inline-block will-change-transform">
                    {ch === " " ? "\u00A0" : ch}
                  </span>
                </span>
              ))}
            </h2>

            <p
              data-contact-line
              data-form-el
              className="mt-4 max-w-sm font-body text-sm leading-relaxed text-sand/50 md:mt-6 md:text-base"
              style={{ willChange: "filter, transform, opacity" }}
            >
              {t("contact.description")}
            </p>

            {formStatus === "sent" ? (
              <div 
                className="mt-8 flex flex-col items-center justify-center gap-4 rounded-2xl border border-ocean/30 bg-ocean/10 py-12 px-6 text-center shadow-lg backdrop-blur-md md:mt-10"
                style={{ willChange: "filter, transform, opacity" }}
              >
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-ocean/20 text-ocean shadow-[inset_0_0_12px_rgba(59,130,196,0.3)]">
                  <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <div>
                  <h3 className="font-heading text-lg font-medium text-sand sm:text-xl">{t("contact.sent")}</h3>
                  <p className="mt-2 font-body text-[13px] text-sand/60">{t("contact.sentSub")}</p>
                </div>
              </div>
            ) : (
            <form
              className="mt-8 flex flex-col gap-4 md:mt-10 md:gap-5"
              onSubmit={handleContactSubmit}
            >
              <div
                data-contact-line
                data-form-el
                className="grid grid-cols-1 gap-4 sm:grid-cols-2"
                style={{ willChange: "filter, transform, opacity" }}
              >
                <div className="flex flex-col gap-1.5">
                  <label className="font-body text-[10px] font-medium uppercase tracking-[0.2em] text-sand/30 sm:text-xs">
                    {t("contact.name")}
                  </label>
                  <input
                    type="text"
                    required
                    value={formName}
                    onChange={(e) => setFormName(e.target.value)}
                    placeholder={t("contact.namePlaceholder")}
                    className="rounded-lg border border-white/10 bg-white/5 px-4 py-3 font-body text-sm text-sand placeholder-sand/25 outline-none transition-colors focus:border-ocean/40 focus:bg-white/8"
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="font-body text-[10px] font-medium uppercase tracking-[0.2em] text-sand/30 sm:text-xs">
                    {t("contact.email")}
                  </label>
                  <input
                    type="email"
                    required
                    value={formEmail}
                    onChange={(e) => setFormEmail(e.target.value)}
                    placeholder={t("contact.emailPlaceholder")}
                    className="rounded-lg border border-white/10 bg-white/5 px-4 py-3 font-body text-sm text-sand placeholder-sand/25 outline-none transition-colors focus:border-ocean/40 focus:bg-white/8"
                  />
                </div>
              </div>
              <div
                data-contact-line
                data-form-el
                className="flex flex-col gap-1.5"
                style={{ willChange: "filter, transform, opacity" }}
              >
                <label className="font-body text-[10px] font-medium uppercase tracking-[0.2em] text-sand/30 sm:text-xs">
                  {t("contact.message")}
                </label>
                <textarea
                  rows={3}
                  required
                  value={formMessage}
                  onChange={(e) => setFormMessage(e.target.value)}
                  placeholder={t("contact.messagePlaceholder")}
                  className="resize-none rounded-lg border border-white/10 bg-white/5 px-4 py-3 font-body text-sm text-sand placeholder-sand/25 outline-none transition-colors focus:border-ocean/40 focus:bg-white/8"
                />
              </div>

              {/* ═══ PHONE REVEAL — animated by GSAP ═══ */}
              <div data-phone-section className="relative z-80 mt-2 flex flex-col gap-2">
                {/* Letter-by-letter text */}
                <p className="font-body text-[10px] font-medium uppercase tracking-[0.2em] text-sand/30 sm:text-xs">
                  {`${t("contact.phone")} (${t("contact.optional")})`
                    .split("")
                    .map((ch: string, i: number) => (
                      <span
                        key={i}
                        data-phone-letter
                        className="inline-block"
                        style={{ opacity: 0 }}
                      >
                        {ch === " " ? "\u00A0" : ch}
                      </span>
                    ))}
                </p>

                {/* Phone input box — slides up from below */}
                <div
                  data-phone-box
                  className="rena-phone-wrap"
                >
                  <PhoneCountrySelect
                    defaultCountry={locale === "pl" ? "PL" : locale === "de" ? "DE" : locale === "fr" ? "FR" : locale === "es" ? "ES" : "IT"}
                    value={formPhone}
                    onChange={setFormPhone}
                    onCountryChange={setSelectedPhoneCountry}
                    placeholder={t("contact.phonePlaceholder")}
                    searchPlaceholder={locale === "pl" ? "Szukaj kraju lub numeru..." : locale === "it" ? "Cerca paese o prefisso..." : locale === "es" ? "Busca país o prefijo..." : locale === "fr" ? "Rechercher un pays ou indicatif..." : locale === "de" ? "Land oder Vorwahl suchen..." : "Search country or code..."}
                    emptyLabel={locale === "pl" ? "Brak wyników" : locale === "it" ? "Nessun risultato" : locale === "es" ? "Sin resultados" : locale === "fr" ? "Aucun résultat" : locale === "de" ? "Keine Ergebnisse" : "No results"}
                    countryButtonLabel={locale === "pl" ? "Wybierz numer kierunkowy" : locale === "it" ? "Seleziona prefisso" : locale === "es" ? "Selecciona prefijo" : locale === "fr" ? "Choisir l'indicatif" : locale === "de" ? "Ländervorwahl wählen" : "Select country code"}
                  />
                </div>
              </div>

              <input
                type="text"
                name="website"
                value={honeypot}
                onChange={(e) => setHoneypot(e.target.value)}
                tabIndex={-1}
                aria-hidden="true"
                style={{ position: "absolute", left: "-9999px", opacity: 0, height: 0 }}
              />
              {process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY && (
                <Turnstile
                  siteKey={process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY}
                  onSuccess={setTurnstileToken}
                  options={{ theme: "dark", size: "normal" }}
                  style={{ marginBottom: "8px" }}
                />
              )}
              <button
                data-contact-line
                data-form-el
                type="submit"
                disabled={formStatus === "loading"}
                className="mt-2 w-fit rounded-full border border-ocean/30 bg-ocean/10 px-8 py-3 font-body text-xs font-medium uppercase tracking-wider text-sand/80 transition-all duration-300 hover:border-ocean/50 hover:bg-ocean/20 hover:text-sand sm:text-sm disabled:opacity-50"
                style={{ willChange: "filter, transform, opacity" }}
              >
                {formStatus === "loading" ? t("contact.sending") : t("contact.submit")}
              </button>
            </form>
            )}
          </div>
        </div>
      </div>

      {/* Wave animations + phone input dark theme (scoped) */}
      <style>{`
        .lct-wave-back-g > use {
          animation: lct-move 25s cubic-bezier(.55,.5,.45,.5) infinite;
        }
        .lct-wave-back-g > use:nth-child(1) { animation-delay: -2s; animation-duration: 6s; }
        .lct-wave-back-g > use:nth-child(2) { animation-delay: -3s; animation-duration: 8s; }
        .lct-wave-back-g > use:nth-child(3) { animation-delay: -4s; animation-duration: 11s; }
        .lct-wave-back-g > use:nth-child(4) { animation-delay: -5s; animation-duration: 16s; }

        .lct-wave-front-g > use {
          animation: lct-move 25s cubic-bezier(.55,.5,.45,.5) infinite;
        }
        .lct-wave-front-g > use:nth-child(1) { animation-delay: -1s; animation-duration: 5s; }
        .lct-wave-front-g > use:nth-child(2) { animation-delay: -2s; animation-duration: 7s; }
        .lct-wave-front-g > use:nth-child(3) { animation-delay: -3s; animation-duration: 10s; }
        .lct-wave-front-g > use:nth-child(4) { animation-delay: -4s; animation-duration: 14s; }

        @keyframes lct-move {
          0%   { transform: translate3d(-120px, 0, 0); }
          100% { transform: translate3d(120px, 0, 0); }
        }

        .rena-phone-wrap {
          position: relative;
          width: 100%;
          z-index: 120;
          overflow: visible;
        }
        .rena-phone-wrap .rena-phone-custom {
          position: relative;
          width: 100%;
          overflow: visible;
          isolation: isolate;
        }
        .rena-phone-wrap .rena-phone-custom__row {
          display: flex;
          align-items: center;
          width: 100%;
          border-radius: 12px;
          border: 1px solid rgba(255,255,255,0.1);
          background: rgba(255,255,255,0.05);
          padding: 0 10px;
          transition: border-color 0.3s ease, background 0.3s ease, box-shadow 0.3s ease, transform 0.3s ease;
          backdrop-filter: blur(10px);
          min-height: 50px;
        }
        .rena-phone-wrap .rena-phone-custom__row:focus-within {
          border-color: rgba(59,130,196,0.4);
          background: rgba(255,255,255,0.08);
          box-shadow: 0 0 0 1px rgba(59,130,196,0.08);
        }
        .rena-phone-wrap .rena-phone-custom__country-btn {
          display: flex;
          align-items: center;
          gap: 8px;
          cursor: pointer;
          flex-shrink: 0;
          position: relative;
          padding: 8px 8px 8px 0;
          border: none;
          background: transparent;
          color: #e8dcc8;
          border-radius: 8px;
          transition: color 0.25s ease, opacity 0.25s ease;
        }
        .rena-phone-wrap .rena-phone-custom__country-btn:hover {
          opacity: 0.92;
        }
        .rena-phone-wrap .rena-phone-custom__flag-img {
          display: block;
          width: 22px;
          height: 16px;
          border-radius: 2px;
          object-fit: cover;
          flex-shrink: 0;
        }
        .rena-phone-wrap .rena-phone-custom__dial {
          font-family: var(--font-body, sans-serif);
          font-size: 12px;
          font-weight: 600;
          letter-spacing: 0.12em;
          color: rgba(232,220,200,0.92);
        }
        .rena-phone-wrap .rena-phone-custom__arrow {
          color: rgba(59,130,196,0.8);
          transition: transform 0.25s ease;
        }
        .rena-phone-wrap .rena-phone-custom__arrow--open {
          transform: rotate(180deg);
        }
        .rena-phone-wrap .rena-phone-custom__divider {
          align-self: stretch;
          width: 1px;
          background: rgba(255,255,255,0.08);
          margin: 8px 12px 8px 6px;
        }
        .rena-phone-wrap .rena-phone-custom__input {
          flex: 1;
          background: transparent;
          border: none;
          outline: none;
          color: #e8dcc8;
          font-family: var(--font-body, sans-serif);
          font-size: 14px;
          min-width: 0;
          letter-spacing: 0.04em;
          padding: 0;
          height: 48px;
        }
        .rena-phone-wrap .rena-phone-custom__input::placeholder {
          color: rgba(232,220,200,0.25);
        }
      `}</style>
    </section>
  );
}
