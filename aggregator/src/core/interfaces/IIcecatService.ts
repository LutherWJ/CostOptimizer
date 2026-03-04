import { HardwareSpecs } from "../../models/hardwareSpecsSchema";

export interface IcecatProductResponse {
  data: {
    GeneralInfo: {
      Brand: string;
      ProductName: string;
      ModelName: string;
    };
    FeaturesGroups: Array<{
      FeatureGroup: {
        Name: {
          Value: string;
        };
      };
      Features: Array<{
        Feature: {
          Name: {
            Value: string;
          };
          Measure?: {
            Sign: string;
          };
        };
        PresentationValue: string;
        RawValue: string | number;
      }>;
    }>;
  };
}

export interface IIcecatService {
  getProductSpecs(brand: string, sku: string): Promise<HardwareSpecs | null>;
  getRawProductData(brand: string, sku: string): Promise<IcecatProductResponse | null>;
}
