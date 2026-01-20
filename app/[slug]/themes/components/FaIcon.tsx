// app/[slug]/themes/components/FaIcon.tsx
"use client";

import React from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import type { IconDefinition } from "@fortawesome/fontawesome-svg-core";

// Solid (free)
import {
  faMapMarkerAlt,
  faPhone,
  faClock,
  faStar,
  faGem,
  faMagic,
  faCalendarCheck,
  faBroom,
  faShieldAlt,
  faHeart,
  faCheckCircle,
  faUserCheck,
  faHandSparkles,
  faAward,
  faBolt,
  faLeaf,
} from "@fortawesome/free-solid-svg-icons";

// (по избор) ако искаш и brand icons в бъдеще:
// import { faInstagram, faFacebookF, faTiktok, faYoutube } from "@fortawesome/free-brands-svg-icons";

const ICONS: Record<string, IconDefinition> = {
  // contact
  "map-marker-alt": faMapMarkerAlt,
  phone: faPhone,
  clock: faClock,

  // common
  star: faStar,
  gem: faGem,
  magic: faMagic,
  "calendar-check": faCalendarCheck,
  broom: faBroom,
  shield: faShieldAlt,
  heart: faHeart,
  "check-circle": faCheckCircle,
  "user-check": faUserCheck,
  "hand-sparkles": faHandSparkles,
  award: faAward,
  bolt: faBolt,
  leaf: faLeaf,
};

export type FaIconName = keyof typeof ICONS;

/**
 * Универсален иконен компонент (Font Awesome Free).
 * Поддържа само whitelist икони от ICONS.
 */
export default function FaIcon({
  name,
  className,
  title,
  sizePx = 22,
}: {
  name: string;
  className?: string;
  title?: string;
  sizePx?: number;
}) {
  const icon = ICONS[name] || faStar;

    return (
    <span
        aria-hidden
        title={title}
        className={className}
        style={{
        display: "inline-flex",
        width: sizePx,
        height: sizePx,
        alignItems: "center",
        justifyContent: "center",
        flexShrink: 0,
        fontSize: sizePx, // ✅ ЕТО ТОВА ЛИПСВАШЕ
        }}
    >
        <FontAwesomeIcon
        icon={icon}
        fixedWidth
        style={{ width: "1em", height: "1em" }}
        />
    </span>
    );

}

