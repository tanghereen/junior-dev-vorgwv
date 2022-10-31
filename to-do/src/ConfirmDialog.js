import React from 'react';
import PropTypes from 'prop-types';
import './App.css';

/**
 * This object is used for type checking the props of the component.
 */
const propTypes = {
    title: PropTypes.string.isRequired,
    message: PropTypes.string.isRequired,
    open: PropTypes.bool.isRequired,
    onCancel: PropTypes.func.isRequired,
    onConfirm: PropTypes.func.isRequired,
};

/**
 * This callback type is called `cancelCallback` and is displayed as a global symbol.
 *
 * @callback cancelCallback
 */

/**
 * This callback type is called `confirmCallback` and is displayed as a global symbol.
 *
 * @callback confirmCallback
 */

/**
 * @description Represents a material UI based Confirm Dialog.
 * @constructor
 * @param {Object} props - The props that were defined by the caller of this component.
 * @param {string} props.title - The message to be displayed by the dialog.
 * @param {boolean} props.open - The visibility of the dialog.
 * @param {cancelCallback} props.onCancel - The callback to execute when the user hits the cancel button.
 * @param {confirmCallback} props.onConfirm - The callback to execute when the user hits the confirm button.
 */