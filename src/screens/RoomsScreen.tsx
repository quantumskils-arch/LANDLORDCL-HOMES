import React, { useState } from 'react';
import { Plus, Edit2, Trash2, UserPlus, Home, AlertCircle, ArrowLeft } from 'lucide-react';
import type { Room, Tenant, RoomType, RoomStatus } from '../types';
import { formatUGX } from '../utils/formatters';
import { saveRoom, deleteRoom } from '../db/indexedDb';
import { Modal } from '../components/Modal';
import { ConfirmationModal } from '../components/ConfirmationModal';
import { useToast } from '../components/Toast';

interface RoomsScreenProps {
  rooms: Room[];
  tenants: Tenant[];
  onRefresh: () => void;
  onAssignTenantToRoom: (roomId: string) => void;
  onBackToMenu?: () => void;
}

const ROOM_TYPES: RoomType[] = [
  'Single Room',
  'Double Room',
  'Self-Contained Single',
  'Self-Contained Double',
  'Bedsitter',
];

export const RoomsScreen: React.FC<RoomsScreenProps> = ({
  rooms,
  tenants,
  onRefresh,
  onAssignTenantToRoom,
  onBackToMenu,
}) => {
  const { showSuccess, showError } = useToast();
  const [filter, setFilter] = useState<'All' | RoomStatus>('All');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingRoom, setEditingRoom] = useState<Room | null>(null);
  const [roomToDelete, setRoomToDelete] = useState<Room | null>(null);

  // Form state
  const [number, setNumber] = useState('');
  const [type, setType] = useState<RoomType>('Single Room');
  const [rentAmount, setRentAmount] = useState('');
  const [description, setDescription] = useState('');
  const [status, setStatus] = useState<RoomStatus>('Vacant');

  const openAddModal = () => {
    setEditingRoom(null);
    setNumber('');
    setType('Single Room');
    setRentAmount('');
    setDescription('');
    setStatus('Vacant');
    setIsModalOpen(true);
  };

  const openEditModal = (room: Room) => {
    setEditingRoom(room);
    setNumber(room.number);
    setType(room.type);
    setRentAmount(String(room.rentAmount));
    setDescription(room.description || '');
    setStatus(room.status);
    setIsModalOpen(true);
  };

  const handleSaveRoom = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!number.trim() || !rentAmount || isNaN(Number(rentAmount))) {
      showError('Please enter a room number and a valid monthly rent.');
      return;
    }

    try {
      const room: Room = {
        id: editingRoom ? editingRoom.id : `room-${Date.now()}`,
        number: number.trim(),
        type,
        rentAmount: Number(rentAmount),
        description: description.trim(),
        status,
        createdAt: editingRoom ? editingRoom.createdAt : new Date().toISOString(),
      };

      await saveRoom(room);
      showSuccess(editingRoom ? `Room ${room.number} updated.` : `Room ${room.number} added successfully.`);
      setIsModalOpen(false);
      onRefresh();
    } catch (err) {
      console.error(err);
      showError('Failed to save room.');
    }
  };

  const handleDeleteRoom = async () => {
    if (!roomToDelete) return;
    try {
      await deleteRoom(roomToDelete.id);
      showSuccess(`Room ${roomToDelete.number} deleted.`);
      setRoomToDelete(null);
      onRefresh();
    } catch (err) {
      console.error(err);
      showError('Failed to delete room.');
    }
  };

  const filteredRooms = rooms.filter((r) => {
    if (filter === 'All') return true;
    return r.status === filter;
  });

  const getOccupant = (roomId: string) => {
    return tenants.find((t) => t.roomId === roomId && t.status === 'Active');
  };

  const counts = {
    All: rooms.length,
    Occupied: rooms.filter((r) => r.status === 'Occupied').length,
    Vacant: rooms.filter((r) => r.status === 'Vacant').length,
    Maintenance: rooms.filter((r) => r.status === 'Maintenance').length,
  };

  return (
    <div className="space-y-5 pb-6">
      {/* Top Menu Breadcrumb Navigation */}
      {onBackToMenu && (
        <div className="flex items-center justify-between pb-1 border-b border-zinc-200/60">
          <button
            type="button"
            onClick={onBackToMenu}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white hover:bg-emerald-50 active:scale-95 text-zinc-700 hover:text-emerald-700 border border-zinc-200/80 shadow-2xs text-xs font-bold transition group min-h-[38px]"
          >
            <ArrowLeft className="w-3.5 h-3.5 text-zinc-400 group-hover:text-emerald-600 transition" />
            <span>← Back to Main Menu</span>
          </button>
          <span className="text-[11px] font-semibold text-emerald-800 bg-emerald-50 border border-emerald-200/60 px-2.5 py-1 rounded-full">
            Rooms & Units
          </span>
        </div>
      )}

      {/* Header */}
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold font-heading text-slate-900">Rooms</h1>
          <p className="text-xs text-slate-500">Manage all units and rental rates</p>
        </div>

        <button
          type="button"
          onClick={openAddModal}
          className="inline-flex items-center gap-1.5 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white text-xs font-bold rounded-xl shadow-xs transition min-h-[44px]"
        >
          <Plus className="w-4 h-4" />
          <span>Add Room</span>
        </button>
      </div>

      {/* Summary Filter Pills */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 no-scrollbar">
        <button
          type="button"
          onClick={() => setFilter('All')}
          className={`px-3.5 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition min-h-[40px] ${
            filter === 'All'
              ? 'bg-black text-white shadow-xs'
              : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
          }`}
        >
          All ({counts.All})
        </button>

        <button
          type="button"
          onClick={() => setFilter('Occupied')}
          className={`px-3.5 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition min-h-[40px] ${
            filter === 'Occupied'
              ? 'bg-emerald-600 text-white shadow-xs'
              : 'bg-white text-emerald-700 border border-emerald-200 hover:bg-emerald-50'
          }`}
        >
          Occupied ({counts.Occupied})
        </button>

        <button
          type="button"
          onClick={() => setFilter('Vacant')}
          className={`px-3.5 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition min-h-[40px] ${
            filter === 'Vacant'
              ? 'bg-zinc-900 text-white shadow-xs'
              : 'bg-white text-zinc-700 border border-zinc-300 hover:bg-zinc-50'
          }`}
        >
          Vacant ({counts.Vacant})
        </button>

        <button
          type="button"
          onClick={() => setFilter('Maintenance')}
          className={`px-3.5 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition min-h-[40px] ${
            filter === 'Maintenance'
              ? 'bg-amber-500 text-white shadow-xs'
              : 'bg-white text-amber-700 border border-amber-200 hover:bg-amber-50'
          }`}
        >
          Maintenance ({counts.Maintenance})
        </button>
      </div>

      {/* Empty State */}
      {filteredRooms.length === 0 ? (
        <div className="bg-white rounded-3xl p-8 text-center border border-slate-200 shadow-xs">
          <Home className="w-12 h-12 text-slate-300 mx-auto mb-3" />
          <h3 className="text-base font-bold text-slate-900 font-heading">
            {rooms.length === 0 ? 'No rooms yet' : `No ${filter} rooms found`}
          </h3>
          <p className="text-xs text-slate-500 mt-1 max-w-xs mx-auto">
            {rooms.length === 0
              ? 'Add your first rental unit to begin managing rooms and tenants.'
              : 'Try selecting a different filter pill above.'}
          </p>
          {rooms.length === 0 && (
            <button
              type="button"
              onClick={openAddModal}
              className="mt-4 inline-flex items-center gap-1.5 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white text-xs font-bold rounded-xl shadow-xs"
            >
              <Plus className="w-4 h-4" />
              <span>Add Your First Room</span>
            </button>
          )}
        </div>
      ) : (
        /* Room Cards Grid */
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 sm:gap-4">
          {filteredRooms.map((room) => {
            const occupant = getOccupant(room.id);

            const statusColors = {
              Occupied: 'bg-emerald-50 text-emerald-700 border-emerald-200',
              Vacant: 'bg-zinc-100 text-zinc-800 border-zinc-300',
              Maintenance: 'bg-amber-50 text-amber-700 border-amber-200',
            }[room.status];

            return (
              <div
                key={room.id}
                className="bg-white rounded-2xl p-4 sm:p-5 border border-slate-200/80 shadow-xs flex flex-col justify-between gap-4 hover:border-slate-300 transition"
              >
                <div className="space-y-2.5">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <span className="text-2xl font-bold font-heading text-slate-900 tracking-tight">
                        {room.number}
                      </span>
                      <div className="mt-1">
                        <span className="inline-block text-[11px] font-medium text-slate-600 bg-slate-100 px-2 py-0.5 rounded-md">
                          {room.type}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5">
                      <span className={`text-[11px] font-bold px-2.5 py-1 rounded-full border ${statusColors}`}>
                        {room.status}
                      </span>
                      <button
                        type="button"
                        onClick={() => openEditModal(room)}
                        className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition min-h-[44px] min-w-[44px] flex items-center justify-center"
                        aria-label="Edit room"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => setRoomToDelete(room)}
                        className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition min-h-[44px] min-w-[44px] flex items-center justify-center"
                        aria-label="Delete room"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  <div>
                    <span className="text-xs text-slate-400 block">Monthly Rent</span>
                    <span className="text-lg font-bold text-emerald-700 font-heading font-amount">
                      {formatUGX(room.rentAmount)}
                    </span>
                  </div>

                  {room.status === 'Occupied' && occupant && (
                    <div className="pt-2 border-t border-slate-100">
                      <span className="text-[11px] text-slate-500 block">Current Tenant</span>
                      <span className="text-xs font-bold text-slate-800">{occupant.fullName}</span>
                      <span className="text-[11px] text-slate-500 ml-1">({occupant.phone})</span>
                    </div>
                  )}

                  {room.description && (
                    <p className="text-xs text-slate-500 line-clamp-2 pt-1 border-t border-slate-50">
                      {room.description}
                    </p>
                  )}
                </div>

                {room.status === 'Vacant' && (
                  <button
                    type="button"
                    onClick={() => onAssignTenantToRoom(room.id)}
                    className="w-full flex items-center justify-center gap-2 py-2.5 px-3 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-300 text-xs font-bold rounded-xl active:scale-98 transition min-h-[44px]"
                  >
                    <UserPlus className="w-3.5 h-3.5" />
                    <span>Assign Tenant</span>
                  </button>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* ADD/EDIT ROOM MODAL */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingRoom ? `Edit Room ${editingRoom.number}` : 'Add New Room'}
      >
        <form onSubmit={handleSaveRoom} className="space-y-4">
          <div>
            <label htmlFor="roomNumber" className="block text-xs font-semibold text-slate-700 mb-1">
              Room Number / Unit Name <span className="text-red-500">*</span>
            </label>
            <input
              id="roomNumber"
              type="text"
              required
              value={number}
              onChange={(e) => setNumber(e.target.value)}
              placeholder="e.g. A1, Room 3, Unit 5"
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-slate-900 text-sm focus:outline-hidden focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600 min-h-[44px]"
            />
          </div>

          <div>
            <label htmlFor="roomType" className="block text-xs font-semibold text-slate-700 mb-1">
              Room Type <span className="text-red-500">*</span>
            </label>
            <select
              id="roomType"
              value={type}
              onChange={(e) => setType(e.target.value as RoomType)}
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-slate-900 text-sm focus:outline-hidden focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600 min-h-[44px] bg-white"
            >
              {ROOM_TYPES.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label htmlFor="rentAmount" className="block text-xs font-semibold text-slate-700 mb-1">
              Monthly Rent (UGX) <span className="text-red-500">*</span>
            </label>
            <input
              id="rentAmount"
              type="number"
              required
              min="0"
              step="1000"
              value={rentAmount}
              onChange={(e) => setRentAmount(e.target.value)}
              placeholder="e.g. 350000"
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-slate-900 text-sm focus:outline-hidden focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600 min-h-[44px]"
            />
            {rentAmount && !isNaN(Number(rentAmount)) && (
              <span className="text-xs text-emerald-600 font-semibold mt-1 block">
                {formatUGX(Number(rentAmount))}
              </span>
            )}
          </div>

          <div>
            <label htmlFor="roomStatus" className="block text-xs font-semibold text-slate-700 mb-1">
              Status <span className="text-red-500">*</span>
            </label>
            <select
              id="roomStatus"
              value={status}
              onChange={(e) => setStatus(e.target.value as RoomStatus)}
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-slate-900 text-sm focus:outline-hidden focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600 min-h-[44px] bg-white"
            >
              <option value="Vacant">Vacant</option>
              <option value="Occupied">Occupied</option>
              <option value="Maintenance">Maintenance</option>
            </select>
          </div>

          <div>
            <label htmlFor="roomDescription" className="block text-xs font-semibold text-slate-700 mb-1">
              Description (Optional notes)
            </label>
            <textarea
              id="roomDescription"
              rows={2}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="e.g. Ground floor, private bathroom, pre-paid power meter"
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-slate-900 text-sm focus:outline-hidden focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600 resize-none"
            />
          </div>

          <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setIsModalOpen(false)}
              className="px-4 py-2.5 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition min-h-[44px]"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white text-xs font-bold rounded-xl shadow-xs transition min-h-[44px]"
            >
              {editingRoom ? 'Save Changes' : 'Add Room'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Delete Confirmation Modal */}
      <ConfirmationModal
        isOpen={!!roomToDelete}
        onClose={() => setRoomToDelete(null)}
        onConfirm={handleDeleteRoom}
        title="Delete Room?"
        message={`Are you sure you want to delete Room ${roomToDelete?.number}? This action cannot be undone.`}
        confirmText="Delete Room"
      />
    </div>
  );
};
