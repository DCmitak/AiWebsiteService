"use client";

import React from "react";
import FaIcon from "@/app/[slug]/themes/components/FaIcon";

export default function FaIconPreview({
  name,
  className,
}: {
  name: string;
  className?: string;
}) {
  return <FaIcon name={name} className={className} />;
}
