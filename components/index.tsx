import { ComponentType } from "react";
import { ComponentInstance } from "@uniformdev/canvas";
import {
  DefaultNotImplementedComponent,
  ComponentProps,
} from "@uniformdev/canvas-react";

import { Hero } from "./Hero";
import TalkList from "./TalkList";
import { WhyAttend } from "./WhyAttend";
import { Talk } from "./Talk";
import { RegisterForm } from "./RegisterForm";
import Navbar from "./Navbar";
import Footer from "./Footer";
import { withFigmaComponents } from ".figma";

const mappings: ComponentMapping = withFigmaComponents({
  hero: Hero,
  talklist: TalkList,
  talk: Talk,
  whyattend: WhyAttend,
  registrationForm: RegisterForm,
  header: Navbar,
  footer: Footer,
});

type ComponentMapping = Record<string, ComponentType<any>>;

export function resolveRenderer(
  component: ComponentInstance
): ComponentType<ComponentProps<any>> | null {
  const componentImpl = mappings[component.type];
  return componentImpl ? componentImpl : DefaultNotImplementedComponent;
}

export default mappings;
