import React from "react";
import { Box, Text, Icon } from "zmp-ui";

type RowProps = {
  thumb?: string;
  title: string;
  meta?: React.ReactNode;
  onClick?: () => void;
};

// Một dòng danh sách theo phong cách Zalo UI: ảnh + tiêu đề + meta + mũi tên.
export function Row({ thumb, title, meta, onClick }: RowProps) {
  return (
    <Box className="row" flex alignItems="center" onClick={onClick}>
      {thumb && <img className="row-thumb" src={thumb} alt="" loading="lazy" />}
      <Box flex flexDirection="column" style={{ flex: 1, minWidth: 0 }}>
        <Text className="row-title">{title}</Text>
        {meta && (
          <Text size="xSmall" className="muted" style={{ marginTop: 4 }}>
            {meta}
          </Text>
        )}
      </Box>
      <Icon icon="zi-chevron-right" className="muted" />
    </Box>
  );
}
