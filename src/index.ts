import Renderer from "./renderer";
import { Fluid, FluidConfig } from "./fluid";

const fluidConfig = new FluidConfig(140, 0.8, 0.6);
const fluid = new Fluid(fluidConfig);
let renderer = new Renderer(fluid);
renderer.start();
