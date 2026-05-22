import { useEffect } from "react";

/** IntersectionObserver — section fade-in on scroll */
export function useScrollReveal(selector = ".lp-reveal") {
  useEffect(() => {
    const nodes = document.querySelectorAll(selector);
    if (!nodes.length) return undefined;

    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (e.isIntersecting) {
            e.target.classList.add("lp-visible");
            io.unobserve(e.target);
          }
        });
      },
      { threshold: 0.12, rootMargin: "0px 0px -40px 0px" }
    );

    nodes.forEach((n) => io.observe(n));
    return () => io.disconnect();
  }, [selector]);
}

export function useNavbarScroll(className = "lp-nav--scrolled") {
  useEffect(() => {
    const nav = document.querySelector(".lp-nav");
    if (!nav) return undefined;

    const onScroll = () => {
      if (window.scrollY > 24) nav.classList.add(className);
      else nav.classList.remove(className);
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, [className]);
}
