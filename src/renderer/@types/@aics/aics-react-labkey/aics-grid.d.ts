declare module "@aics/aics-react-labkey" {
  export interface AicsGridCell {
    row: number;
    col: number;
  }

  export interface AicsGridProps {
    selectedCells: AicsGridCell[];
    selectMode?:
      | "multi"
      | "single"
      | "contiguous"
      | "non-contiguous"
      | "disabled";
    cellHeight?: string;
    cellWidth?: string;
    fontSize?: string;
    onCellClick?: (
      event: React.MouseEvent<HTMLDivElement>,
      row: number,
      col: number,
      data: any
    ) => void;
    onSelectedCellsChanged?: (cells: AicsGridCell[]) => void;
    displayBackground: (cellData: any) => string;
    displayText: (cellData: any) => string | JSX.Element;
    cells: any[][];
  }

  export class AicsGrid extends React.Component<
    AicsGridProps,
    Record<string, any>
  > {
    constructor(props: AicsGridProps);

    public render(): JSX.Element | null;
  }
}
