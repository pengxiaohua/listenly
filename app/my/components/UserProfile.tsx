'use client';

import { useEffect, useState } from 'react';
import Image from 'next/image';
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { toast } from 'sonner';
import { useAuthStore } from '@/store/auth';

interface UserProfile {
  id: string;
  userName: string;
  avatar: string;
}

function UserProfileComponent() {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [editedUserName, setEditedUserName] = useState('');
  const [editedAvatar, setEditedAvatar] = useState('');
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);

  // 获取全局状态更新函数
  const setUserInfo = useAuthStore(state => state.setUserInfo);

  useEffect(() => {
    fetchUserProfile();
  }, []);

  const fetchUserProfile = async () => {
    try {
      const response = await fetch('/api/user');
      if (response.ok) {
        const data = await response.json();
        setProfile(data);
        setEditedUserName(data.userName);
        setEditedAvatar(data.avatar);
      } else {
        console.error('API响应失败:', response.status, response.statusText);
      }
    } catch (error) {
      console.error('获取用户信息失败:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!editedUserName) {
      toast.error('请输入用户名');
      return;
    }

    try {
      setUploading(true);

      let avatarUrl = editedAvatar;

      // 如果有新的头像文件，先上传
      if (avatarFile) {
        const formData = new FormData();
        formData.append('avatar', avatarFile);

        const uploadResponse = await fetch('/api/user/avatar', {
          method: 'POST',
          body: formData,
        });

        if (!uploadResponse.ok) {
          const errorData = await uploadResponse.json();
          toast.error(errorData.error || '头像上传失败');
          return;
        }

        const uploadResult = await uploadResponse.json();
        avatarUrl = uploadResult.url;
      }

      // 更新用户信息
      const response = await fetch('/api/user', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userName: editedUserName,
          avatar: avatarUrl,
        }),
      });

      if (response.ok) {
        const updatedProfile = await response.json();
        setProfile(updatedProfile);
        setEditing(false);
        setAvatarFile(null);

        // 同步更新全局状态，确保Header中的头像也更新
        setUserInfo({
          userName: updatedProfile.userName,
          avatar: updatedProfile.avatar,
          isAdmin: updatedProfile.isAdmin,
        });

        toast.success('个人信息更新成功');
      } else {
        throw new Error('更新失败');
      }
    } catch (error) {
      console.error('更新用户信息失败:', error);
      toast.error('更新失败，请重试');
    } finally {
      setUploading(false);
    }
  };

  if (loading) {
    return <div className="flex justify-center items-center h-[calc(100vh-64px)]">加载中...</div>;
  }

  if (!profile) {
    return <div className="flex justify-center items-center h-[calc(100vh-64px)]">获取用户信息失败</div>;
  }

  return (
    <div className="max-w-2xl mx-auto p-6 space-y-8">
      <div className="flex items-center gap-6">
        {/* <Avatar className="w-24 h-24">
          <AvatarImage src={profile.avatar} />
          <Image src={profile.avatar} alt="头像" width={96} height={96} />
          <AvatarFallback>用户</AvatarFallback>
        </Avatar> */}
          {profile.avatar && profile.avatar.trim() !== '' ? (
            <Image
              src={profile.avatar}
              alt="头像"
              width={96}
              height={96}
              className="rounded-full object-cover h-[96px] w-[96px]"
            />
          ) : (
          <div className="w-24 h-24 rounded-full bg-slate-200 flex items-center justify-center">
            <span className="text-slate-500 text-2xl">👤</span>
          </div>
        )}
        <div className="flex-1 space-y-4">
          {editing ? (
            <>
              <div className="space-y-2">
                <label className="text-sm font-medium">用户名</label>
                <Input
                  value={editedUserName}
                  onChange={(e) => setEditedUserName(e.target.value)}
                  placeholder="请输入用户名"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">头像</label>
                <div className="flex items-center gap-4">
                  <Avatar className="w-16 h-16">
                    <AvatarImage src={avatarFile ? URL.createObjectURL(avatarFile) : editedAvatar} />
                    <AvatarFallback>预览</AvatarFallback>
                  </Avatar>
                  <div className="flex-1">
                    <label
                      htmlFor="avatar-upload"
                      className="inline-block px-4 py-2 rounded-full text-sm font-semibold bg-primary text-primary-foreground hover:bg-primary/90 cursor-pointer"
                    >
                      选择文件
                    </label>
                    <input
                      id="avatar-upload"
                      type="file"
                      accept="image/png,image/jpeg,image/jpg"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) {
                          setAvatarFile(file);
                        }
                      }}
                      className="hidden"
                    />
                    <p className="mt-1 text-xs text-slate-500">
                      支持 PNG、JPG、JPEG 格式，文件大小不超过 5MB
                    </p>
                  </div>
                </div>
              </div>
              <div className="flex gap-2">
                <Button
                  className='cursor-pointer'
                  onClick={handleSave}
                  disabled={uploading}
                >
                  {uploading ? '保存中...' : '保存'}
                </Button>
                <Button
                  className='cursor-pointer'
                  variant="outline"
                  onClick={() => {
                    setEditing(false);
                    setAvatarFile(null);
                  }}
                  disabled={uploading}
                >
                  取消
                </Button>
              </div>
            </>
          ) : (
            <>
              <div>
                <div className="text-sm text-slate-500">用户名</div>
                <div className="text-lg font-medium">{profile.userName}</div>
              </div>
              {/* <Button className='cursor-pointer' onClick={() => setEditing(true)}>编辑资料</Button> */}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

export default UserProfileComponent;
