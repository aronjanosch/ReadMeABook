/**
 * Component: Indexer Configuration Modal
 * Documentation: documentation/frontend/components.md
 */

'use client';

import React, { useState, useEffect } from 'react';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { CategoryTreeView } from './CategoryTreeView';
import { DEFAULT_CATEGORIES } from '@/lib/utils/torrent-categories';

interface IndexerConfigModalProps {
  isOpen: boolean;
  onClose: () => void;
  mode: 'add' | 'edit';
  indexer: {
    id: number;
    name: string;
    protocol: string;
    supportsRss: boolean;
  };
  initialConfig?: {
    priority: number;
    seedingTimeMinutes?: number;
    removeAfterProcessing?: boolean;
    rssEnabled: boolean;
    categories: number[];
  };
  onSave: (config: {
    id: number;
    name: string;
    protocol: string;
    priority: number;
    seedingTimeMinutes?: number;
    removeAfterProcessing?: boolean;
    rssEnabled: boolean;
    categories: number[];
  }) => void;
}

export function IndexerConfigModal({
  isOpen,
  onClose,
  mode,
  indexer,
  initialConfig,
  onSave,
}: IndexerConfigModalProps) {
  // Default values for Add mode
  const isTorrent = indexer.protocol?.toLowerCase() === 'torrent';
  const defaults = {
    priority: 10,
    seedingTimeMinutes: 0,
    removeAfterProcessing: true, // Default to true for Usenet
    rssEnabled: indexer.supportsRss,
    categories: DEFAULT_CATEGORIES, // Default to Audio/Audiobook [3030]
  };

  // Form state
  const [priority, setPriority] = useState(
    initialConfig?.priority ?? defaults.priority
  );
  const [seedingTimeMinutes, setSeedingTimeMinutes] = useState(
    initialConfig?.seedingTimeMinutes ?? defaults.seedingTimeMinutes
  );
  const [removeAfterProcessing, setRemoveAfterProcessing] = useState(
    initialConfig?.removeAfterProcessing ?? defaults.removeAfterProcessing
  );
  const [rssEnabled, setRssEnabled] = useState(
    initialConfig?.rssEnabled ?? defaults.rssEnabled
  );
  const [selectedCategories, setSelectedCategories] = useState<number[]>(
    initialConfig?.categories ?? defaults.categories
  );

  // Validation errors
  const [errors, setErrors] = useState<{
    priority?: string;
    seedingTimeMinutes?: string;
    categories?: string;
  }>({});

  // Reset form when modal opens or indexer changes
  useEffect(() => {
    if (isOpen) {
      if (mode === 'add') {
        setPriority(defaults.priority);
        setSeedingTimeMinutes(defaults.seedingTimeMinutes);
        setRemoveAfterProcessing(defaults.removeAfterProcessing);
        setRssEnabled(defaults.rssEnabled);
        setSelectedCategories(defaults.categories);
      } else {
        setPriority(initialConfig?.priority ?? defaults.priority);
        setSeedingTimeMinutes(initialConfig?.seedingTimeMinutes ?? defaults.seedingTimeMinutes);
        setRemoveAfterProcessing(initialConfig?.removeAfterProcessing ?? defaults.removeAfterProcessing);
        setRssEnabled(initialConfig?.rssEnabled ?? defaults.rssEnabled);
        setSelectedCategories(initialConfig?.categories ?? defaults.categories);
      }
      setErrors({});
    }
  }, [isOpen, mode, indexer.id]);

  const validate = () => {
    const newErrors: typeof errors = {};

    if (priority < 1 || priority > 25) {
      newErrors.priority = 'Priority must be between 1 and 25';
    }

    if (isTorrent && seedingTimeMinutes < 0) {
      newErrors.seedingTimeMinutes = 'Seeding time cannot be negative';
    }

    if (selectedCategories.length === 0) {
      newErrors.categories = 'At least one category must be selected';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSave = () => {
    if (!validate()) {
      return;
    }

    const config: any = {
      id: indexer.id,
      name: indexer.name,
      protocol: indexer.protocol,
      priority,
      rssEnabled: indexer.supportsRss ? rssEnabled : false,
      categories: selectedCategories,
    };

    // Add protocol-specific fields
    if (isTorrent) {
      config.seedingTimeMinutes = seedingTimeMinutes;
    } else {
      config.removeAfterProcessing = removeAfterProcessing;
    }

    onSave(config);
    onClose();
  };

  const handlePriorityChange = (value: string) => {
    const parsed = parseInt(value);
    if (!isNaN(parsed)) {
      // Clamp value between 1 and 25
      setPriority(Math.max(1, Math.min(25, parsed)));
    } else if (value === '') {
      setPriority(1);
    }
  };

  const handleSeedingTimeChange = (value: string) => {
    if (value === '') {
      setSeedingTimeMinutes(0);
    } else {
      const parsed = parseInt(value);
      if (!isNaN(parsed)) {
        setSeedingTimeMinutes(Math.max(0, parsed));
      }
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={mode === 'add' ? 'Add Indexer' : 'Edit Indexer'}
      size="md"
    >
      <div className="space-y-6">
        {/* Indexer Info (readonly) */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Indexer
          </label>
          <div className="flex items-center gap-2 p-3 bg-gray-50 dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700">
            <span className="text-base font-medium text-gray-900 dark:text-gray-100">
              {indexer.name}
            </span>
            <span className="text-xs px-2 py-1 rounded bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-400">
              {indexer.protocol}
            </span>
          </div>
        </div>

        {/* Priority */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Priority (1-25)
          </label>
          <Input
            type="number"
            min="1"
            max="25"
            value={priority}
            onChange={(e) => handlePriorityChange(e.target.value)}
            className={errors.priority ? 'border-red-500' : ''}
          />
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            Higher values = preferred in ranking algorithm
          </p>
          {errors.priority && (
            <p className="text-sm text-red-600 dark:text-red-400 mt-1">
              {errors.priority}
            </p>
          )}
        </div>

        {/* Seeding Time (Torrents only) */}
        {isTorrent && (
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Seeding Time (minutes)
            </label>
            <Input
              type="number"
              min="0"
              step="1"
              value={seedingTimeMinutes}
              onChange={(e) => handleSeedingTimeChange(e.target.value)}
              placeholder="0"
              className={errors.seedingTimeMinutes ? 'border-red-500' : ''}
            />
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
              0 = unlimited seeding (files remain seeded indefinitely)
            </p>
            {errors.seedingTimeMinutes && (
              <p className="text-sm text-red-600 dark:text-red-400 mt-1">
                {errors.seedingTimeMinutes}
              </p>
            )}
          </div>
        )}

        {/* Remove After Processing (Usenet only) */}
        {!isTorrent && (
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Post-Processing Cleanup
            </label>
            <div className="flex items-center gap-3">
              <input
                type="checkbox"
                checked={removeAfterProcessing}
                onChange={(e) => setRemoveAfterProcessing(e.target.checked)}
                className="h-5 w-5 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              />
              <span className="text-sm text-gray-600 dark:text-gray-400">
                Remove download from SABnzbd after files are organized
              </span>
            </div>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">
              Recommended: Automatically deletes completed NZB downloads to save disk space
            </p>
          </div>
        )}

        {/* RSS Monitoring */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            RSS Monitoring
          </label>
          <div className="flex items-center gap-3">
            <input
              type="checkbox"
              checked={rssEnabled}
              onChange={(e) => setRssEnabled(e.target.checked)}
              disabled={!indexer.supportsRss}
              className="h-5 w-5 rounded border-gray-300 text-blue-600 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
            />
            <span className="text-sm text-gray-600 dark:text-gray-400">
              Auto-check RSS feeds every 15 minutes
            </span>
          </div>
          {!indexer.supportsRss && (
            <p className="text-sm text-yellow-600 dark:text-yellow-400 mt-2">
              This indexer does not support RSS monitoring
            </p>
          )}
        </div>

        {/* Categories */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
            Categories
          </label>
          <div className="max-h-96 overflow-y-auto border border-gray-200 dark:border-gray-700 rounded-lg p-4">
            <CategoryTreeView
              selectedCategories={selectedCategories}
              onChange={setSelectedCategories}
            />
          </div>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">
            Select categories to search on this indexer. Parent selection locks all children as selected.
          </p>
          {errors.categories && (
            <p className="text-sm text-red-600 dark:text-red-400 mt-1">
              {errors.categories}
            </p>
          )}
        </div>

        {/* Action Buttons */}
        <div className="flex justify-end gap-3 pt-4 border-t border-gray-200 dark:border-gray-700">
          <Button onClick={onClose} variant="outline">
            Cancel
          </Button>
          <Button onClick={handleSave} variant="primary">
            {mode === 'add' ? 'Add Indexer' : 'Save Changes'}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
