import Renderer from "./renderer";
import { Fluid, FluidConfig } from "./fluid";

const fluidConfig = new FluidConfig(128, 1, 0.1);
const fluid = new Fluid(fluidConfig);
let renderer = new Renderer(fluid);
renderer.start();
