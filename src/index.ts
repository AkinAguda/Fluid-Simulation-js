import Renderer from "./renderer";
import { Fluid, FluidConfig } from "./fluid";

const fluidConfig = new FluidConfig(170, 0.3, 0.7);
const fluid = new Fluid(fluidConfig);
let renderer = new Renderer(fluid);
renderer.start();
