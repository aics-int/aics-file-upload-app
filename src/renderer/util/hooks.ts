import * as React from "react";
import { TableInstance } from "react-table";

// This solution came from: https://stackoverflow.com/questions/43817118/how-to-get-the-width-of-a-react-element
export const useContainerDimensions = (myRef: React.RefObject<any>) => {
  const [dimensions, setDimensions] = React.useState({ width: 0, height: 0 });

  React.useEffect(() => {
    const getDimensions = () => ({
      width: myRef.current.offsetWidth,
      height: myRef.current.offsetHeight,
    });
    const handleResize = () => {
      setDimensions(getDimensions());
    };

    if (myRef.current) {
      setDimensions(getDimensions());
    }

    window.addEventListener("resize", handleResize);

    return () => {
      window.removeEventListener("resize", handleResize);
    };
  }, [myRef]);

  return dimensions;
};

// react-table features the ability to toggle columns as hidden. This is especially useful
// to control which columns are visible without having to recompute the columns array supplied
// to react-table which would otherwise force the table's inner state to partially reset causing
// some undesirable effects like losing user adjusted column widths
export const useHiddenColumns = (
  tableInstance: TableInstance<any>,
  columnsToHide: string[]
) => {
  const { setHiddenColumns } = tableInstance;
  const isHidingExpectedColumns = tableInstance.allColumns.every(
    (column) => column.isVisible === !columnsToHide.some((c) => c === column.id)
  );

  React.useEffect(() => {
    if (!isHidingExpectedColumns) {
      console.log(
        "setting hidden columns",
        isHidingExpectedColumns,
        columnsToHide
      );
      setHiddenColumns(columnsToHide);
    }
  }, [columnsToHide, isHidingExpectedColumns, setHiddenColumns]);
};
