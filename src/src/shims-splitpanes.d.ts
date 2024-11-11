declare module 'splitpanes' {
    import { DefineComponent } from 'vue';
    
    export const Splitpanes: DefineComponent<{
      direction?: 'horizontal' | 'vertical';
      sizes?: number[];
      minSize?: number | string;
      maxSize?: number | string;
    }, {}, any>;
    
    export const Pane: DefineComponent<{
      size?: number | string;
      minSize?: number | string;
      maxSize?: number | string;
    }, {}, any>;
    
    export default Splitpanes;
  }
  