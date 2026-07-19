import { type ChangeEvent, useEffect, useRef, useState } from "react";
import api from "../services/api";
import { presetAvatarUrl } from "../services/avatar";
import UserAvatar from "./UserAvatar";
import "./AvatarEditor.css";

type Preset = { id: string; label: string; avatarUrl: string };
type SavedAvatar = { avatarUrl: string; avatarKind: string; avatarPreset?: string | null };

type AvatarEditorProps = {
  username: string;
  avatarUrl?: string | null;
  avatarPreset?: string | null;
  onSaved: (avatar: SavedAvatar) => Promise<void> | void;
};

const MAX_AVATAR_BYTES = 5 * 1024 * 1024;
const ACCEPTED_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);

function errorMessage(error: unknown) {
  return (
    (error as { response?: { data?: { message?: string } } })?.response?.data?.message ||
    (error instanceof Error ? error.message : "Не удалось сохранить аватар.")
  );
}

function canvasBlob(canvas: HTMLCanvasElement) {
  return new Promise<Blob>((resolve, reject) => {
    canvas.toBlob((blob) => blob ? resolve(blob) : reject(new Error("Не удалось подготовить изображение.")), "image/webp", 0.9);
  });
}

export default function AvatarEditor({ username, avatarUrl, avatarPreset, onSaved }: AvatarEditorProps) {
  const [presets, setPresets] = useState<Preset[]>([]);
  const [selectedPreset, setSelectedPreset] = useState(avatarPreset || "");
  const [sourceUrl, setSourceUrl] = useState("");
  const [zoom, setZoom] = useState(1);
  const [offsetX, setOffsetX] = useState(0);
  const [offsetY, setOffsetY] = useState(0);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [status, setStatus] = useState("");
  const imageRef = useRef<HTMLImageElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    let active = true;
    void api.get("/users/avatar-presets")
      .then(({ data }) => { if (active) setPresets(Array.isArray(data?.data) ? data.data : []); })
      .catch((loadError) => { if (active) setError(errorMessage(loadError)); });
    return () => { active = false; };
  }, []);

  useEffect(() => () => {
    if (sourceUrl) URL.revokeObjectURL(sourceUrl);
  }, [sourceUrl]);

  useEffect(() => {
    const image = imageRef.current;
    const canvas = canvasRef.current;
    if (!image || !canvas || !image.complete || !image.naturalWidth) return;
    const context = canvas.getContext("2d");
    if (!context) return;
    const sourceSize = Math.min(image.naturalWidth, image.naturalHeight) / zoom;
    const x = (image.naturalWidth - sourceSize) * ((offsetX + 100) / 200);
    const y = (image.naturalHeight - sourceSize) * ((offsetY + 100) / 200);
    context.clearRect(0, 0, canvas.width, canvas.height);
    context.drawImage(image, x, y, sourceSize, sourceSize, 0, 0, canvas.width, canvas.height);
  }, [offsetX, offsetY, sourceUrl, zoom]);

  function drawLoadedImage(image: HTMLImageElement) {
    imageRef.current = image;
    setZoom(1);
    setOffsetX(0);
    setOffsetY(0);
    const canvas = canvasRef.current;
    const context = canvas?.getContext("2d");
    if (canvas && context) {
      const size = Math.min(image.naturalWidth, image.naturalHeight);
      context.clearRect(0, 0, canvas.width, canvas.height);
      context.drawImage(image, (image.naturalWidth - size) / 2, (image.naturalHeight - size) / 2, size, size, 0, 0, canvas.width, canvas.height);
    }
  }

  function selectFile(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    setError("");
    setStatus("");
    if (!ACCEPTED_TYPES.has(file.type)) {
      setError("Поддерживаются только изображения JPG, PNG и WEBP.");
      return;
    }
    if (file.size > MAX_AVATAR_BYTES) {
      setError("Файл должен быть не больше 5 МБ.");
      return;
    }
    if (sourceUrl) URL.revokeObjectURL(sourceUrl);
    const nextUrl = URL.createObjectURL(file);
    const image = new Image();
    image.onload = () => { setSourceUrl(nextUrl); drawLoadedImage(image); };
    image.onerror = () => { URL.revokeObjectURL(nextUrl); setError("Файл не является корректным изображением."); };
    image.src = nextUrl;
  }

  async function saveUpload() {
    const canvas = canvasRef.current;
    if (!sourceUrl || !canvas || saving) return;
    setSaving(true);
    setError("");
    setStatus("");
    try {
      const blob = await canvasBlob(canvas);
      const form = new FormData();
      form.append("avatar", blob, "frame-school-avatar.webp");
      const { data } = await api.post("/users/me/avatar", form, { headers: { "Content-Type": "multipart/form-data" } });
      if (data?.success !== true || !data?.data?.avatarUrl) throw new Error("Сервер не подтвердил сохранение фотографии.");
      await onSaved(data.data);
      setStatus(data.message || "Фотография профиля сохранена.");
    } catch (saveError) {
      setError(errorMessage(saveError));
    } finally {
      setSaving(false);
    }
  }

  async function savePreset() {
    if (!selectedPreset || saving) return;
    setSaving(true);
    setError("");
    setStatus("");
    try {
      const { data } = await api.post("/users/me/avatar/preset", { presetId: selectedPreset });
      if (data?.success !== true || data?.data?.avatarPreset !== selectedPreset) throw new Error("Сервер не подтвердил выбранный аватар.");
      await onSaved(data.data);
      setStatus(data.message || "Стандартный аватар сохранён.");
    } catch (saveError) {
      setError(errorMessage(saveError));
    } finally {
      setSaving(false);
    }
  }

  async function resetAvatar() {
    if (saving) return;
    setSaving(true);
    setError("");
    setStatus("");
    try {
      const { data } = await api.delete("/users/me/avatar");
      if (data?.success !== true || data?.data?.avatarKind !== "INITIALS") throw new Error("Сервер не подтвердил сброс аватара.");
      setSelectedPreset("");
      await onSaved(data.data);
      setStatus(data.message || "Теперь используются инициалы.");
    } catch (saveError) {
      setError(errorMessage(saveError));
    } finally {
      setSaving(false);
    }
  }

  return (
    <section className="avatar-editor" aria-label="Настройка аватара" aria-busy={saving}>
      <div className="avatar-editor__current">
        <UserAvatar name={username} avatarUrl={avatarUrl} size="profile" />
        <div><span className="timecode">PROFILE / AVATAR</span><h2>Ваш аватар</h2><p>Загрузите фото, выберите кадр или используйте один из стандартных вариантов Frame School.</p></div>
      </div>

      <div className="avatar-editor__columns">
        <div className="avatar-editor__upload">
          <h3>Своя фотография</h3>
          <label className="avatar-file-button">
            Выбрать JPG, PNG или WEBP
            <input type="file" accept="image/jpeg,image/png,image/webp" onChange={selectFile} disabled={saving} />
          </label>
          <small>До 5 МБ. Перед сохранением изображение кадрируется и оптимизируется до WEBP 512×512.</small>
          {sourceUrl && (
            <div className="avatar-cropper">
              <canvas ref={canvasRef} width="512" height="512" aria-label="Предпросмотр кадрированного аватара" />
              <label>Масштаб<input type="range" min="1" max="3" step="0.05" value={zoom} onChange={(event) => setZoom(Number(event.target.value))} /></label>
              <label>По горизонтали<input type="range" min="-100" max="100" value={offsetX} onChange={(event) => setOffsetX(Number(event.target.value))} /></label>
              <label>По вертикали<input type="range" min="-100" max="100" value={offsetY} onChange={(event) => setOffsetY(Number(event.target.value))} /></label>
              <button type="button" onClick={() => void saveUpload()} disabled={saving}>{saving ? "Сохраняем…" : "Сохранить фотографию"}</button>
            </div>
          )}
        </div>

        <div className="avatar-editor__presets">
          <h3>Стандартные аватары</h3>
          <div className="avatar-preset-grid" role="radiogroup" aria-label="Стандартные аватары">
            {presets.map((preset) => (
              <button
                key={preset.id}
                type="button"
                role="radio"
                aria-checked={selectedPreset === preset.id}
                className={selectedPreset === preset.id ? "is-selected" : ""}
                onClick={() => { setSelectedPreset(preset.id); setError(""); setStatus(""); }}
                disabled={saving}
                title={preset.label}
              >
                <img src={presetAvatarUrl(preset.id)} alt="" loading="lazy" />
              </button>
            ))}
          </div>
          <div className="avatar-editor__actions">
            <button type="button" onClick={() => void savePreset()} disabled={!selectedPreset || saving}>{saving ? "Сохраняем…" : "Применить выбранный"}</button>
            <button type="button" onClick={() => void resetAvatar()} disabled={saving}>Использовать инициалы</button>
          </div>
        </div>
      </div>

      <div className="avatar-editor__feedback" aria-live="polite" aria-atomic="true">
        {error && <p role="alert">{error}</p>}
        {!error && status && <p role="status">{status}</p>}
      </div>
    </section>
  );
}
