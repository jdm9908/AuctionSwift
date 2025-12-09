import { useEffect, useState } from "react";
import { motion, useScroll, useTransform } from "framer-motion";
import { useInView } from "react-intersection-observer";
import { Link } from "react-router-dom";
import { ArrowRight } from "lucide-react";

export function HomePage() {
  // TYPEWRITER ANIMATION FOR TITLE
  const fullText = "EstateBid";
  const [displayText, setDisplayText] = useState("");

  useEffect(() => {
    let i = 0;
    const interval = setInterval(() => {
      i += 1;
      setDisplayText(fullText.slice(0, i));
      if (i >= fullText.length) {
        clearInterval(interval);
      }
    }, 100);
    return () => clearInterval(interval);
  }, []);

  // MOVING BACKGROUND
  const { scrollY } = useScroll();
  const bgY1 = useTransform(scrollY, [0, 600], [0, 150]);
  const bgY2 = useTransform(scrollY, [0, 600], [0, -120]);

  const { ref: s1Ref, inView: s1Visible } = useInView({ threshold: 0.15 });
  const { ref: s2Ref, inView: s2Visible } = useInView({ threshold: 0.15 });
  const { ref: s3Ref, inView: s3Visible } = useInView({ threshold: 0.15 });
  const { ref: s4Ref, inView: s4Visible } = useInView({ threshold: 0.15 });
  const { ref: s5Ref, inView: s5Visible } = useInView({ threshold: 0.15 });

  const stepCommon =
    "p-6 md:p-7 rounded-3xl bg-white/10 backdrop-blur-xl border border-white/15 shadow-lg text-center";

  return (
    <div className="relative w-full min-h-screen overflow-hidden bg-gradient-to-b from-black via-zinc-900 to-indigo-950 text-white">
      {/* MOVING BACKGROUND ORBS */}
      <motion.div
        style={{ y: bgY1 }}
        animate={{ x: [0, 60, 0] }}
        transition={{ duration: 24, repeat: Infinity, ease: "easeInOut" }}
        className="pointer-events-none absolute -top-40 -left-32 w-[32rem] h-[32rem] bg-indigo-500/40 blur-[140px] rounded-full"
      />
      <motion.div
        style={{ y: bgY2 }}
        animate={{ x: [0, -70, 0] }}
        transition={{ duration: 28, repeat: Infinity, ease: "easeInOut" }}
        className="pointer-events-none absolute -bottom-56 -right-40 w-[36rem] h-[36rem] bg-purple-500/35 blur-[160px] rounded-full"
      />
      <motion.div
        animate={{ x: [0, 40, -20, 0] }}
        transition={{ duration: 30, repeat: Infinity, ease: "linear" }}
        className="pointer-events-none absolute top-1/3 right-1/4 w-72 h-72 bg-sky-400/25 blur-[130px] rounded-full"
      />

      {/* HERO SECTION - FULL SCREEN SO STEPS ARE BELOW FOLD */}
      <section className="relative z-10 min-h-screen flex flex-col items-center justify-center px-6 text-center">
        <motion.h1
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7 }}
          className="text-5xl md:text-7xl font-extrabold tracking-tight drop-shadow-xl mb-6"
        >
          {displayText}
        </motion.h1>

        {/* NEW HOOKING SLOGAN */}
        <motion.p
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.25, duration: 0.5 }}
          className="text-xl md:text-2xl text-neutral-200 italic font-light mb-5 max-w-2xl"
        >
          Turn a lifetime of belongings into a weekend of bids.
        </motion.p>

        {/* SHORT DESCRIPTION WITHOUT FEE MENTION */}
        <motion.p
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4, duration: 0.55 }}
          className="text-base md:text-lg text-neutral-400 max-w-3xl"
        >
          Built for estate liquidation. Upload belongings, let AI write descriptions and pull
          comps, and run full household auctions from one simple place.
        </motion.p>
      </section>

      {/* HOW ESTATEBID WORKS - CENTERED, ONLY VISIBLE AFTER SCROLL */}
      <section className="relative z-10 py-20 md:py-24 max-w-6xl mx-auto px-6">
        <h2 className="text-3xl md:text-4xl font-bold mb-14 text-center">
          How EstateBid Works
        </h2>

        <div className="grid gap-7 md:grid-cols-2 lg:grid-cols-3 justify-items-center">
          {/* Step 1 */}
          <motion.div
            ref={s1Ref}
            initial={{ opacity: 0, y: 40 }}
            animate={s1Visible ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.5 }}
            className={stepCommon}
          >
            <h3 className="text-lg font-semibold mb-2">1. Create your estate sale</h3>
            <p className="text-sm md:text-base text-neutral-200">
              Sign in and set up a new estate auction in minutes, built for large multi item
              liquidations instead of one item at a time.
            </p>
          </motion.div>

          {/* Step 2 */}
          <motion.div
            ref={s2Ref}
            initial={{ opacity: 0, y: 40 }}
            animate={s2Visible ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.5, delay: 0.05 }}
            className={stepCommon}
          >
            <h3 className="text-lg font-semibold mb-2">2. Upload items</h3>
            <p className="text-sm md:text-base text-neutral-200">
              Drop in photos and a few basics like brand, model, year and short notes. No long
              form copy, no spreadsheets.
            </p>
          </motion.div>

          {/* Step 3 */}
          <motion.div
            ref={s3Ref}
            initial={{ opacity: 0, y: 40 }}
            animate={s3Visible ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.5, delay: 0.1 }}
            className={stepCommon}
          >
            <h3 className="text-lg font-semibold mb-2">3. Let AI do the work</h3>
            <p className="text-sm md:text-base text-neutral-200">
              EstateBid AI writes professional descriptions and pulls market comps so you skip
              manual research and pricing.
            </p>
          </motion.div>

          {/* Step 4 */}
          <motion.div
            ref={s4Ref}
            initial={{ opacity: 0, y: 40 }}
            animate={s4Visible ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.5, delay: 0.15 }}
            className={stepCommon}
          >
            <h3 className="text-lg font-semibold mb-2">4. Configure your auction</h3>
            <p className="text-sm md:text-base text-neutral-200">
              Set times, pickup location, shipping rules, starting prices and bid increments
              from one clean control panel.
            </p>
          </motion.div>

          {/* Step 5 */}
          <motion.div
            ref={s5Ref}
            initial={{ opacity: 0, y: 40 }}
            animate={s5Visible ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.5, delay: 0.2 }}
            className={stepCommon + " md:col-span-2 lg:col-span-1"}
          >
            <h3 className="text-lg font-semibold mb-2">5. Launch, monitor and get paid</h3>
            <p className="text-sm md:text-base text-neutral-200">
              Go live, watch bids in real time, let auctions close automatically and manage
              payouts from a single dashboard.
            </p>
          </motion.div>
        </div>
      </section>

      {/* CALL TO ACTION */}
      <section className="relative z-10 flex justify-center pb-24">
        <motion.div whileHover={{ scale: 1.05 }} className="relative group">
          <Link to="/login">
            <button className="px-10 md:px-12 py-4 md:py-5 text-lg md:text-xl font-semibold bg-white text-black rounded-full shadow-2xl flex items-center gap-2 relative z-20">
              Get Started <ArrowRight className="w-5 h-5 md:w-6 md:h-6" />
            </button>
          </Link>
          <div className="absolute inset-0 rounded-full opacity-0 group-hover:opacity-100 transition duration-300 bg-indigo-500 blur-xl" />
        </motion.div>
      </section>
    </div>
  );
}
