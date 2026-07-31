import { Suspense } from "react";
import LandingClient from "./LandingClient";

export default function Home() {
  return (
    <Suspense fallback={null}>
      <LandingClient />
    </Suspense>
  );
}
