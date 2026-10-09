import { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

interface Collaborator {
  id: string;
  email: string;
  name: string;
  role: 'viewer' | 'editor' | 'owner';
  avatar_url?: string;
  isOnline?: boolean;
  lastActive?: Date;
  cursorPosition?: { x: number; y: number };
}

interface Props {
  materialId: string;
  currentUserId: string;
  onCollaboratorsUpdate: (collaborators: Collaborator[]) => void;
}

export default function CollaborationManager({ materialId, currentUserId, onCollaboratorsUpdate }: Props) {
  const [collaborators, setCollaborators] = useState<Collaborator[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [showInviteDialog, setShowInviteDialog] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState<'viewer' | 'editor'>('viewer');
  const [isEditing, setIsEditing] = useState(false);
  const [cursorPosition, setCursorPosition] = useState({ x: 0, y: 0 });

  useEffect(() => {
    fetchCollaborators();
    setupRealtimeSubscription();
    setupPresenceTracking();
    return () => {
      // Cleanup subscriptions
      supabase.removeAllSubscriptions();
    };
  }, [materialId]);

  const setupRealtimeSubscription = () => {
    // Subscribe to changes in the material content
    const materialSubscription = supabase
      .channel(`material-${materialId}`)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'research_materials',
        filter: `id=eq.${materialId}`
      }, (payload) => {
        // Handle material updates
        console.log('Material updated:', payload);
      })
      .subscribe();

    // Subscribe to cursor position updates
    const cursorSubscription = supabase
      .channel(`cursor-${materialId}`)
      .on('broadcast', { event: 'cursor-move' }, ({ payload }) => {
        if (payload.userId !== currentUserId) {
          updateCollaboratorCursor(payload.userId, payload.position);
        }
      })
      .subscribe();

    return () => {
      materialSubscription.unsubscribe();
      cursorSubscription.unsubscribe();
    };
  };

  const setupPresenceTracking = () => {
    const presenceChannel = supabase.channel(`presence-${materialId}`);

    // Track user presence
    presenceChannel
      .on('presence', { event: 'sync' }, () => {
        const newState = presenceChannel.presenceState();
        updateCollaboratorPresence(newState);
      })
      .on('presence', { event: 'join' }, ({ key, newPresences }) => {
        console.log('User joined:', newPresences);
      })
      .on('presence', { event: 'leave' }, ({ key, leftPresences }) => {
        console.log('User left:', leftPresences);
      })
      .subscribe(async (status) => {
        if (status === 'SUBSCRIBED') {
          await presenceChannel.track({
            userId: currentUserId,
            lastActive: new Date().toISOString()
          });
        }
      });

    // Update last active timestamp periodically
    const interval = setInterval(() => {
      presenceChannel.track({
        userId: currentUserId,
        lastActive: new Date().toISOString()
      });
    }, 30000); // Update every 30 seconds

    return () => {
      clearInterval(interval);
      presenceChannel.unsubscribe();
    };
  };

  const updateCollaboratorPresence = (presenceState: any) => {
    setCollaborators(prevCollaborators => 
      prevCollaborators.map(collaborator => ({
        ...collaborator,
        isOnline: !!presenceState[collaborator.id],
        lastActive: presenceState[collaborator.id]?.lastActive 
          ? new Date(presenceState[collaborator.id].lastActive)
          : undefined
      }))
    );
  };

  const updateCollaboratorCursor = (userId: string, position: { x: number; y: number }) => {
    setCollaborators(prevCollaborators =>
      prevCollaborators.map(collaborator =>
        collaborator.id === userId
          ? { ...collaborator, cursorPosition: position }
          : collaborator
      )
    );
  };

  const handleCursorMove = (event: MouseEvent) => {
    const position = { x: event.clientX, y: event.clientY };
    setCursorPosition(position);
    
    // Broadcast cursor position to other collaborators
    supabase
      .channel(`cursor-${materialId}`)
      .send({
        type: 'broadcast',
        event: 'cursor-move',
        payload: {
          userId: currentUserId,
          position
        }
      });
  };

  const fetchCollaborators = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('Authentication required');

      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/research/materials/${materialId}/collaborators`, {
        headers: {
          'Authorization': `Bearer ${session.access_token}`
        }
      });

      if (!response.ok) {
        throw new Error('Failed to fetch collaborators');
      }

      const data = await response.json();
      setCollaborators(data.collaborators);
    } catch (error: any) {
      setError(error.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleInviteCollaborator = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('Authentication required');

      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/research/materials/${materialId}/collaborators`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          email: inviteEmail,
          role: inviteRole
        })
      });

      if (!response.ok) {
        throw new Error('Failed to invite collaborator');
      }

      const data = await response.json();
      setCollaborators([...collaborators, data.collaborator]);
      setShowInviteDialog(false);
      setInviteEmail('');
    } catch (error: any) {
      setError(error.message);
    }
  };

  const handleUpdateRole = async (collaboratorId: string, newRole: 'viewer' | 'editor') => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('Authentication required');

      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/research/materials/${materialId}/collaborators/${collaboratorId}`, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ role: newRole })
      });

      if (!response.ok) {
        throw new Error('Failed to update collaborator role');
      }

      setCollaborators(collaborators.map(collaborator =>
        collaborator.id === collaboratorId
          ? { ...collaborator, role: newRole }
          : collaborator
      ));
    } catch (error: any) {
      setError(error.message);
    }
  };

  const handleRemoveCollaborator = async (collaboratorId: string) => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('Authentication required');

      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/research/materials/${materialId}/collaborators/${collaboratorId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${session.access_token}`
        }
      });

      if (!response.ok) {
        throw new Error('Failed to remove collaborator');
      }

      setCollaborators(collaborators.filter(collaborator => collaborator.id !== collaboratorId));
    } catch (error: any) {
      setError(error.message);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-32">
        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-500" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h4 className="text-sm font-medium text-gray-500">Collaborators</h4>
        <div className="flex items-center space-x-2">
          <button
            onClick={() => setIsEditing(!isEditing)}
            className={`text-sm ${
              isEditing ? 'text-green-600' : 'text-blue-600'
            } hover:text-blue-800`}
          >
            {isEditing ? 'Stop Editing' : 'Start Editing'}
          </button>
          <button
            onClick={() => setShowInviteDialog(true)}
            className="text-sm text-blue-600 hover:text-blue-800"
          >
            Invite Collaborator
          </button>
        </div>
      </div>

      {error && (
        <div className="text-sm text-red-600">
          {error}
        </div>
      )}

      <div className="space-y-2">
        {collaborators.map((collaborator) => (
          <div key={collaborator.id} className="flex items-center justify-between p-2 bg-gray-50 rounded-md">
            <div className="flex items-center space-x-3">
              <div className="relative">
                {collaborator.avatar_url ? (
                  <img
                    src={collaborator.avatar_url}
                    alt={collaborator.name}
                    className="w-8 h-8 rounded-full"
                  />
                ) : (
                  <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center">
                    <span className="text-sm text-gray-500">
                      {collaborator.name.charAt(0).toUpperCase()}
                    </span>
                  </div>
                )}
                <div className={`absolute bottom-0 right-0 w-3 h-3 rounded-full ${
                  collaborator.isOnline ? 'bg-green-500' : 'bg-gray-400'
                } border-2 border-white`} />
              </div>
              <div>
                <p className="text-sm font-medium text-gray-900">{collaborator.name}</p>
                <p className="text-xs text-gray-500">{collaborator.email}</p>
                {collaborator.lastActive && !collaborator.isOnline && (
                  <p className="text-xs text-gray-400">
                    Last active: {new Date(collaborator.lastActive).toLocaleString()}
                  </p>
                )}
              </div>
            </div>
            <div className="flex items-center space-x-2">
              {collaborator.id !== currentUserId && (
                <>
                  <select
                    value={collaborator.role}
                    onChange={(e) => handleUpdateRole(collaborator.id, e.target.value as 'viewer' | 'editor')}
                    className="text-sm border border-gray-300 rounded-md px-2 py-1"
                  >
                    <option value="viewer">Viewer</option>
                    <option value="editor">Editor</option>
                  </select>
                  <button
                    onClick={() => handleRemoveCollaborator(collaborator.id)}
                    className="text-red-600 hover:text-red-800"
                  >
                    Remove
                  </button>
                </>
              )}
            </div>
          </div>
        ))}
      </div>

      {isEditing && (
        <div className="mt-4 p-4 bg-blue-50 rounded-md">
          <p className="text-sm text-blue-700">
            You are currently editing. Other collaborators can see your cursor position.
          </p>
        </div>
      )}

      {showInviteDialog && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Invite Collaborator</h3>
            <div className="space-y-4">
              <div>
                <label htmlFor="email" className="block text-sm font-medium text-gray-700">
                  Email Address
                </label>
                <input
                  type="email"
                  id="email"
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                  className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Enter email address"
                />
              </div>
              <div>
                <label htmlFor="role" className="block text-sm font-medium text-gray-700">
                  Role
                </label>
                <select
                  id="role"
                  value={inviteRole}
                  onChange={(e) => setInviteRole(e.target.value as 'viewer' | 'editor')}
                  className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="viewer">Viewer</option>
                  <option value="editor">Editor</option>
                </select>
              </div>
              <div className="flex justify-end space-x-3">
                <button
                  onClick={() => setShowInviteDialog(false)}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                >
                  Cancel
                </button>
                <button
                  onClick={handleInviteCollaborator}
                  className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                >
                  Invite
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
} 