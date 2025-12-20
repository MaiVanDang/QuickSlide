// cmdk.d.ts
declare module "cmdk" {
  import * as React from "react";

  export const Command: React.FC<React.HTMLAttributes<HTMLDivElement>> & {
    Input: React.FC<React.InputHTMLAttributes<HTMLInputElement>>;
    List: React.FC<any>;
    Item: React.FC<any>;
    Group: React.FC<any>;
    Separator: React.FC<any>;
    Empty: React.FC<any>;
  };
  export const CommandInput: React.FC<React.InputHTMLAttributes<HTMLInputElement>>;
  export const CommandList: React.FC<any>;
  export const CommandItem: React.FC<any>;
  export const CommandGroup: React.FC<any>;
  export const CommandSeparator: React.FC<any>;
  export const CommandEmpty: React.FC<any>;
}
