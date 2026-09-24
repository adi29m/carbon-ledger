"use client";

import { useEffect } from "react";

export function LandingMotion() {
  useEffect(() => {
    const menu = document.querySelector<HTMLDetailsElement>(".landing-mobile-nav");
    const links = Array.from(menu?.querySelectorAll("a") ?? []);
    const closeMenu = () => menu?.removeAttribute("open");
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") closeMenu();
    };
    links.forEach((link) => link.addEventListener("click", closeMenu));
    document.addEventListener("keydown", closeOnEscape);
    return () => {
      links.forEach((link) => link.removeEventListener("click", closeMenu));
      document.removeEventListener("keydown", closeOnEscape);
    };
  }, []);

  useEffect(() => {
    const header = document.querySelector<HTMLElement>(".landing-header");
    if (!header) return;

    const sections = ["why", "product", "workflow", "faq"]
      .map((id) => document.getElementById(id))
      .filter((section): section is HTMLElement => Boolean(section));
    const navLinks = Array.from(header.querySelectorAll<HTMLAnchorElement>("[data-nav-target]"));
    let frame = 0;

    const update = () => {
      frame = 0;
      const scrollable = document.documentElement.scrollHeight - window.innerHeight;
      const progress = scrollable > 0 ? Math.min(1, Math.max(0, window.scrollY / scrollable)) : 0;
      header.style.setProperty("--landing-scroll-progress", progress.toString());
      header.classList.toggle("is-scrolled", window.scrollY > 20);

      let active = sections[0]?.id;
      sections.forEach((section) => {
        if (section.getBoundingClientRect().top <= window.innerHeight * 0.44) active = section.id;
      });

      const activeIndex = Math.max(0, sections.findIndex((section) => section.id === active));
      header.style.setProperty("--landing-active-index", activeIndex.toString());
      navLinks.forEach((link) => {
        const isActive = link.dataset.navTarget === active;
        link.classList.toggle("is-active", isActive);
        if (isActive) link.setAttribute("aria-current", "location");
        else link.removeAttribute("aria-current");
      });
    };

    const scheduleUpdate = () => {
      if (!frame) frame = window.requestAnimationFrame(update);
    };
    update();
    window.addEventListener("scroll", scheduleUpdate, { passive: true });
    window.addEventListener("resize", scheduleUpdate);
    return () => {
      window.removeEventListener("scroll", scheduleUpdate);
      window.removeEventListener("resize", scheduleUpdate);
      if (frame) window.cancelAnimationFrame(frame);
    };
  }, []);

  useEffect(() => {
    const page = document.querySelector<HTMLElement>(".landing-page");
    if (!page || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    const sections = Array.from(page.querySelectorAll<HTMLElement>("[data-reveal]"));
    if (!window.IntersectionObserver) return;

    page.classList.add("has-motion");
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          entry.target.classList.add("is-visible");
          observer.unobserve(entry.target);
        });
      },
      { threshold: 0.12, rootMargin: "0px 0px -24px 0px" },
    );
    sections.forEach((section) => observer.observe(section));
    return () => {
      observer.disconnect();
      page.classList.remove("has-motion");
    };
  }, []);

  return null;
}
