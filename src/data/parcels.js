// The upazila offices' land registry (parcels.json), with the bundled pictures of each field.
import registry from './fields/parcels.json';

export const PARCELS = registry.parcels;

export const decToBigha = (dec) => dec / 33;
