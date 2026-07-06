import { useEffect, useState } from "react";
import { getUserInfo } from "zmp-sdk/apis";

export type ZaloUser = {
  id: string;
  name: string;
  avatar: string;
};

// Lấy thông tin người dùng Zalo. Khi chạy ngoài Zalo (trình duyệt dev) sẽ
// trả về null thay vì crash.
export function useUser() {
  const [user, setUser] = useState<ZaloUser | null>(null);

  useEffect(() => {
    let active = true;
    getUserInfo({ autoRequestPermission: false })
      .then((res) => {
        if (active && res?.userInfo) {
          setUser({
            id: String(res.userInfo.id),
            name: res.userInfo.name,
            avatar: res.userInfo.avatar,
          });
        }
      })
      .catch(() => {
        /* không chạy trong Zalo hoặc bị từ chối quyền — bỏ qua */
      });
    return () => {
      active = false;
    };
  }, []);

  return user;
}
