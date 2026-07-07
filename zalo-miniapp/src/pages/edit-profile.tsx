import React, { useState } from "react";
import { Page, Header, Box, Text, Input, Button, useNavigate, useSnackbar } from "zmp-ui";
import { useAuth } from "../hooks/useAuth";
import { updateMyProfile } from "../api";
import { Loading } from "../components/states";

export default function EditProfilePage() {
  const navigate = useNavigate();
  const snackbar = useSnackbar();
  const { loading, signedIn, profile, reloadProfile } = useAuth();

  const [displayName, setDisplayName] = useState(profile?.display_name ?? "");
  const [bio, setBio] = useState(profile?.bio ?? "");
  const [ffId, setFfId] = useState(profile?.ff_id ?? "");
  const [saving, setSaving] = useState(false);

  if (loading) {
    return (
      <Page className="page">
        <Header title="Chỉnh sửa hồ sơ" />
        <Loading />
      </Page>
    );
  }

  if (!signedIn) {
    navigate("/login", { animate: false });
    return null;
  }

  const save = async () => {
    if (ffId && !/^\d{6,12}$/.test(ffId.trim())) {
      snackbar.openSnackbar({ text: "Free Fire ID phải là 6–12 chữ số.", type: "warning" });
      return;
    }
    setSaving(true);
    try {
      await updateMyProfile({
        display_name: displayName.trim() || undefined,
        bio: bio.trim(),
        ff_id: ffId.trim(),
      });
      await reloadProfile();
      snackbar.openSnackbar({ text: "Đã lưu hồ sơ!", type: "success" });
      navigate("/account", { animate: false });
    } catch (e) {
      snackbar.openSnackbar({
        text: e instanceof Error ? e.message : "Không lưu được.",
        type: "error",
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Page className="page">
      <Header title="Chỉnh sửa hồ sơ" />

      <Box className="auth-card" flex flexDirection="column" style={{ gap: 14 }}>
        <Input
          label="Tên hiển thị"
          placeholder="Tên của bạn"
          value={displayName}
          onChange={(e) => setDisplayName(e.target.value)}
          maxLength={80}
        />
        <Input.TextArea
          label="Giới thiệu"
          placeholder="Vài dòng về bạn…"
          value={bio}
          onChange={(e) => setBio(e.target.value)}
          showCount
          maxLength={300}
        />
        <Input
          label="Free Fire ID"
          placeholder="6–12 chữ số"
          value={ffId}
          onChange={(e) => setFfId(e.target.value)}
          clearable
        />
        <Text size="xxSmall" className="muted">
          Muốn chỉnh mạng xã hội, ảnh đại diện, khung… hãy mở hồ sơ đầy đủ trên web.
        </Text>
        <Button fullWidth loading={saving} onClick={save}>
          Lưu thay đổi
        </Button>
      </Box>
    </Page>
  );
}
